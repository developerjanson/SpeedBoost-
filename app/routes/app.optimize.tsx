import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { compressImage } from "../optimizer.server";
import db from "../db.server";

function generateAltText(productTitle: string, index: number): string {
  return index === 0 ? `${productTitle} - Product Photo` : `${productTitle} - Product Photo ${index + 1}`;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const settings = await db.settings.findUnique({ where: { shop: session.shop } });
  if (!settings || !settings.appEnabled) {
    return { error: "App is disabled in settings" };
  }
  if (!settings.imageCompression && !settings.autoAltText) {
    return { error: "No optimization features are enabled" };
  }

  const formData = await request.formData();
  const cursorRaw = formData.get("cursor") as string | null;
const cursor = cursorRaw && cursorRaw.length > 0 ? cursorRaw : null;
  const source = (formData.get("source") as string) || "products";

  const results: {
    name: string;
    status: string;
    savedPercent?: number;
    altUpdated?: boolean;
    beforeUrl?: string;
    afterUrl?: string;
  }[] = [];
  let processedCount = 0;
  let hasMore = false;
  let nextCursor: string | null = null;
  let nextSource = source;

  if (source === "products") {
    const productsResponse = await admin.graphql(
      `#graphql
      query getProducts($cursor: String) {
        products(first: 10, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              title
              images(first: 3) {
                edges { node { id url altText } }
              }
            }
          }
        }
      }`,
      { variables: { cursor } }
    );
    const productsJson = await productsResponse.json();
    const products = productsJson.data.products.edges;
    const pageInfo = productsJson.data.products.pageInfo;

    for (const { node: product } of products) {
      let imageIndex = 0;
      for (const { node: image } of product.images.edges) {
        const needsAltText = settings.autoAltText && (!image.altText || image.altText.trim() === "");
        const newAltText = needsAltText ? generateAltText(product.title, imageIndex) : image.altText || "";

        try {
          if (settings.imageCompression) {
            const originalResp = await fetch(image.url);
            const originalSize = Number(originalResp.headers.get("content-length") || 0);

            const { buffer, contentType, filename } = await compressImage(
              image.url,
              settings.compressionQuality,
              settings.maxWidth,
              settings.convertWebp
            );
            const savedPercent = originalSize
              ? Math.round(((originalSize - buffer.length) / originalSize) * 100)
              : 0;

            const stagedResponse = await admin.graphql(
              `#graphql
              mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
                stagedUploadsCreate(input: $input) {
                  stagedTargets { url resourceUrl parameters { name value } }
                  userErrors { field message }
                }
              }`,
              { variables: { input: [{ filename, mimeType: contentType, httpMethod: "POST", resource: "IMAGE" }] } }
            );
            const stagedJson = await stagedResponse.json();
            const target = stagedJson.data.stagedUploadsCreate.stagedTargets[0];

            const uploadForm = new FormData();
            target.parameters.forEach((p: any) => uploadForm.append(p.name, p.value));
            uploadForm.append("file", new Blob([new Uint8Array(buffer)], { type: contentType }), filename);
            await fetch(target.url, { method: "POST", body: uploadForm });

            await admin.graphql(
              `#graphql
              mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
                productCreateMedia(productId: $productId, media: $media) {
                  media { alt }
                  mediaUserErrors { field message }
                }
              }`,
              {
                variables: {
                  productId: product.id,
                  media: [{ originalSource: target.resourceUrl, alt: newAltText, mediaContentType: "IMAGE" }],
                },
              }
            );

            processedCount++;
            results.push({
              name: product.title,
              status: "optimized",
              savedPercent,
              altUpdated: needsAltText,
              beforeUrl: image.url,
              afterUrl: target.resourceUrl,
            });
          } else if (needsAltText) {
            await admin.graphql(
              `#graphql
              mutation productImageUpdate($productId: ID!, $image: ImageInput!) {
                productImageUpdate(productId: $productId, image: $image) {
                  image { altText }
                  userErrors { field message }
                }
              }`,
              { variables: { productId: product.id, image: { id: image.id, altText: newAltText } } }
            );
            processedCount++;
            results.push({ name: product.title, status: "alt-text-updated", altUpdated: true, beforeUrl: image.url });
          }
        } catch (err: any) {
          results.push({ name: product.title, status: "failed" });
        }
        imageIndex++;
      }
    }

    hasMore = pageInfo.hasNextPage || true; // after products, move on to files
    nextCursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
    if (!pageInfo.hasNextPage) {
      nextSource = "files";
      nextCursor = null;
      hasMore = true;
    }
  } else if (source === "files") {
    const filesResponse = await admin.graphql(
      `#graphql
      query getFiles($cursor: String) {
        files(first: 10, after: $cursor, query: "media_type:Image") {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              alt
              ... on MediaImage {
                image { url }
              }
            }
          }
        }
      }`,
      { variables: { cursor } }
    );
    const filesJson = await filesResponse.json();
    const files = filesJson.data.files.edges;
    const pageInfo = filesJson.data.files.pageInfo;

    for (const { node: file } of files) {
      if (!file.image?.url) continue;
      const needsAltText = settings.autoAltText && (!file.alt || file.alt.trim() === "");

      try {
        if (settings.imageCompression) {
          const originalResp = await fetch(file.image.url);
          const originalSize = Number(originalResp.headers.get("content-length") || 0);

          const { buffer, contentType, filename } = await compressImage(
            file.image.url,
            settings.compressionQuality,
            settings.maxWidth,
            settings.convertWebp
          );
          const savedPercent = originalSize
            ? Math.round(((originalSize - buffer.length) / originalSize) * 100)
            : 0;

          const stagedResponse = await admin.graphql(
            `#graphql
            mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
              stagedUploadsCreate(input: $input) {
                stagedTargets { url resourceUrl parameters { name value } }
              }
            }`,
            { variables: { input: [{ filename, mimeType: contentType, httpMethod: "POST", resource: "IMAGE" }] } }
          );
          const stagedJson = await stagedResponse.json();
          const target = stagedJson.data.stagedUploadsCreate.stagedTargets[0];

          const uploadForm = new FormData();
          target.parameters.forEach((p: any) => uploadForm.append(p.name, p.value));
          uploadForm.append("file", new Blob([new Uint8Array(buffer)], { type: contentType }), filename);
          await fetch(target.url, { method: "POST", body: uploadForm });

          await admin.graphql(
            `#graphql
            mutation fileUpdate($files: [FileUpdateInput!]!) {
              fileUpdate(files: $files) {
                files { id }
                userErrors { field message }
              }
            }`,
            { variables: { files: [{ id: file.id, alt: needsAltText ? "Store Image" : file.alt || "" }] } }
          );

          processedCount++;
          results.push({
            name: "File image",
            status: "optimized",
            savedPercent,
            altUpdated: needsAltText,
            beforeUrl: file.image.url,
            afterUrl: target.resourceUrl,
          });
        }
      } catch (err: any) {
        results.push({ name: "File image", status: "failed" });
      }
    }

    hasMore = pageInfo.hasNextPage;
    nextCursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
    nextSource = "files";
  }

  return { processedCount, results, hasMore, nextCursor, nextSource };
};