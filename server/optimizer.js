const fetch = require("node-fetch");
const sharp = require("sharp");
const { shopify } = require("./shopify");
const { getSettings, addLog } = require("./db");

const PRODUCTS_QUERY = `
  query GetProducts($cursor: String) {
    products(first: 25, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          title
          images(first: 20) {
            edges {
              node {
                id
                url
                altText
                width
              }
            }
          }
        }
      }
    }
  }
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchAllProductsWithImages(client) {
  let products = [];
  let cursor = null;
  let hasNext = true;

  while (hasNext) {
    const res = await client.query({
      data: { query: PRODUCTS_QUERY, variables: { cursor } },
    });
    const data = res.body?.data?.products;
    if (!data) break;
    products = products.concat(data.edges.map((e) => e.node));
    hasNext = data.pageInfo.hasNextPage;
    cursor = data.pageInfo.endCursor;
    await sleep(500); // rate-limit friendly
  }
  return products;
}

// Ek image download -> compress -> Shopify REST Image endpoint pe base64 attachment
// ke through wapas upload (yeh existing image ko replace karta hai, ID same rehti hai)
async function compressAndReplaceImage({ session, productId, imageId, imageUrl, settings }) {
  const productNumericId = productId.split("/").pop();
  const imageNumericId = imageId.split("/").pop();

  const originalRes = await fetch(imageUrl);
  const originalBuffer = await originalRes.buffer();
  const originalKb = originalBuffer.length / 1024;

  let pipeline = sharp(originalBuffer).rotate();
  const meta = await pipeline.metadata();

  if (meta.width && meta.width > settings.max_image_width) {
    pipeline = pipeline.resize({ width: settings.max_image_width });
  }

  const format = settings.convert_to_webp ? "webp" : meta.format === "png" ? "png" : "jpeg";
  if (format === "webp") {
    pipeline = pipeline.webp({ quality: settings.compression_quality });
  } else if (format === "png") {
    pipeline = pipeline.png({ quality: settings.compression_quality, compressionLevel: 9 });
  } else {
    pipeline = pipeline.jpeg({ quality: settings.compression_quality, mozjpeg: true });
  }

  const optimizedBuffer = await pipeline.toBuffer();
  const optimizedKb = optimizedBuffer.length / 1024;

  // Agar optimized file bari hi ho gayi (rare case), to original rehne dein
  if (optimizedKb >= originalKb) {
    return { skipped: true, originalKb, optimizedKb };
  }

  const shopUrl = `https://${session.shop}/admin/api/${shopify.config.apiVersion}/products/${productNumericId}/images/${imageNumericId}.json`;

  const putRes = await fetch(shopUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": session.accessToken,
    },
    body: JSON.stringify({
      image: {
        id: Number(imageNumericId),
        attachment: optimizedBuffer.toString("base64"),
      },
    }),
  });

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`Shopify image update failed (${putRes.status}): ${text}`);
  }

  return { skipped: false, originalKb, optimizedKb };
}

// Poore store ka optimization run - saare products/images
async function runFullOptimization(session) {
  const settings = getSettings(session.shop);

  if (!settings.app_enabled) {
    return { stopped: true, reason: "App backend se disabled hai (debug switch off)." };
  }
  if (!settings.compress_images) {
    return { stopped: true, reason: "Image compression setting off hai." };
  }

  const client = new shopify.clients.Graphql({ session });
  const products = await fetchAllProductsWithImages(client);

  let processed = 0;
  let savedKb = 0;

  for (const product of products) {
    for (const edge of product.images.edges) {
      const image = edge.node;
      try {
        const result = await compressAndReplaceImage({
          session,
          productId: product.id,
          imageId: image.id,
          imageUrl: image.url,
          settings,
        });

        addLog({
          shop: session.shop,
          product_id: product.id,
          image_id: image.id,
          status: result.skipped ? "skipped" : "success",
          original_kb: result.originalKb,
          optimized_kb: result.optimizedKb,
          message: result.skipped
            ? "Optimized file bari thi, original rakhi gayi."
            : `${Math.round(result.originalKb)}KB -> ${Math.round(result.optimizedKb)}KB`,
        });

        if (!result.skipped) savedKb += result.originalKb - result.optimizedKb;
        processed++;
        await sleep(600); // Shopify REST rate limit ke liye zaroori
      } catch (err) {
        addLog({
          shop: session.shop,
          product_id: product.id,
          image_id: image.id,
          status: "error",
          original_kb: null,
          optimized_kb: null,
          message: err.message,
        });
      }
    }
  }

  return { stopped: false, productsScanned: products.length, imagesProcessed: processed, savedKb };
}

module.exports = { runFullOptimization };
