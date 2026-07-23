export async function compressImage(
  imageUrl: string,
  quality: number,
  maxWidth: number,
  convertWebp: boolean
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const sharp = (await import("sharp")).default;

  // Fetch with timeout to avoid hanging on slow/unresponsive CDNs
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  let response: Response;
  try {
    response = await fetch(imageUrl, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status}): ${imageUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  const metadata = await sharp(inputBuffer).metadata();
  const hasTransparency = metadata.hasAlpha === true;

  // Clamp quality and width to safe ranges
  const safeQuality = Math.min(100, Math.max(1, quality || 80));
  const safeMaxWidth = maxWidth > 0 ? Math.max(50, maxWidth) : 0;

  let pipeline = sharp(inputBuffer);

  if (safeMaxWidth > 0) {
    pipeline = pipeline.resize({ width: safeMaxWidth, withoutEnlargement: true });
  }

  let outputBuffer: Buffer;
  let contentType: string;
  let extension: string;

  if (convertWebp) {
    // WebP supports transparency, safe in all cases
    outputBuffer = await pipeline.webp({ quality: safeQuality }).toBuffer();
    contentType = "image/webp";
    extension = "webp";
  } else if (hasTransparency) {
    // Preserve transparency — don't force JPEG on images with alpha channel
    outputBuffer = await pipeline.png({ quality: safeQuality }).toBuffer();
    contentType = "image/png";
    extension = "png";
  } else {
    outputBuffer = await pipeline.jpeg({ quality: safeQuality }).toBuffer();
    contentType = "image/jpeg";
    extension = "jpg";
  }

  return {
    buffer: outputBuffer,
    contentType,
    filename: `optimized-${Date.now()}.${extension}`,
  };
}