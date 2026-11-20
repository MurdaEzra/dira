/** Browser-only photo helpers: shrink, strip metadata (re-encoding drops EXIF/GPS), blur faces and plates. */
import type { PhotoAnalysis } from "./photo-types";

async function load(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: "from-image" });
}

function toJpeg(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode_failed"))), "image/jpeg", quality),
  );
}

/** Longest side ≤ max px, JPEG, no metadata. */
export async function compressImage(file: Blob, max = 1280): Promise<Blob> {
  const img = await load(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close();
  return toJpeg(canvas);
}

/** Heavy blur over every face/plate region, padded so edges never leak. */
export async function blurRegions(blob: Blob, regions: PhotoAnalysis["privacy_regions"]): Promise<Blob> {
  if (regions.length === 0) return blob;
  const img = await load(blob);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const radius = Math.max(16, Math.round(Math.max(img.width, img.height) / 40));
  for (const r of regions) {
    const pad = 0.25;
    const x = Math.max(0, (r.x - r.w * pad) * img.width);
    const y = Math.max(0, (r.y - r.h * pad) * img.height);
    const w = Math.min(img.width - x, r.w * (1 + 2 * pad) * img.width);
    const h = Math.min(img.height - y, r.h * (1 + 2 * pad) * img.height);
    if (w <= 0 || h <= 0) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.filter = `blur(${radius}px)`;
    // Draw a few times so the blur is strong enough to hide identity.
    for (let i = 0; i < 3; i++) ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  }
  img.close();
  return toJpeg(canvas);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
