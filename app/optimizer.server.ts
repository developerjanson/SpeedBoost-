import sharp from "sharp";

export async function compressImage(
  imageUrl: string,
  quality: number,
  maxWidth: number,
  convertWebp: boolean
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  let pipeline = sharp(inputBuffer);

  if (maxWidth > 0) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }

  let outputBuffer: Buffer;
  let contentType: string;
  let extension: string;

  if (convertWebp) {
    outputBuffer = await pipeline.webp({ quality }).toBuffer();
    contentType = "image/webp";
    extension = "webp";
  } else {
    outputBuffer = await pipeline.jpeg({ quality }).toBuffer();
    contentType = "image/jpeg";
    extension = "jpg";
  }

  return {
    buffer: outputBuffer,
    contentType,
    filename: `optimized-${Date.now()}.${extension}`,
  };
}