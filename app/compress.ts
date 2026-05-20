"use client";

import { log, warn } from "./log";

// Anthropic's hard limit for inline images.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 2048;
const QUALITY_LADDER = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];

export async function compressIfNeeded(
  file: File,
  maxBytes = MAX_IMAGE_BYTES,
): Promise<File> {
  if (file.size <= maxBytes) return file;
  log("compress.start", {
    name: file.name,
    size: file.size,
    type: file.type,
  });
  const t0 = performance.now();

  // 1. Preserve EXIF (if JPEG with EXIF) so GPS survives the canvas roundtrip.
  let exifBytes: string | null = null;
  try {
    if (file.type === "image/jpeg") {
      const piexif = (await import("piexifjs")).default;
      const sourceDataUrl = await blobToDataUrl(file);
      const exifObj = piexif.load(sourceDataUrl);
      const tagCount = countTags(exifObj as unknown as Record<string, unknown>);
      if (exifObj && tagCount > 0) {
        exifBytes = piexif.dump(exifObj);
        log("compress.exif-read", { tags: tagCount });
      }
    }
  } catch (err) {
    warn("compress.exif-read-failed", err);
  }

  // 2. Decode → canvas (scaled down if oversized).
  const bitmap = await fileToBitmap(file);
  let { width, height } = bitmap;
  const maxDim = Math.max(width, height);
  if (maxDim > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / maxDim;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("compress: no 2d context");
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  // 3. Walk quality ladder until result fits the budget. Reserve a little
  //    headroom for the EXIF payload we're about to splice back in.
  const budget = exifBytes
    ? Math.max(maxBytes - exifBytes.length - 1024, maxBytes * 0.95)
    : maxBytes;

  let outBlob: Blob | null = null;
  let usedQuality = 0;
  for (const q of QUALITY_LADDER) {
    const blob = await canvasToBlob(canvas, "image/jpeg", q);
    if (blob.size <= budget) {
      outBlob = blob;
      usedQuality = q;
      break;
    }
  }
  if (!outBlob) {
    outBlob = await canvasToBlob(canvas, "image/jpeg", 0.3);
    usedQuality = 0.3;
  }
  log("compress.encoded", {
    width,
    height,
    quality: usedQuality,
    size: outBlob.size,
  });

  // 4. Re-inject EXIF (best effort).
  if (exifBytes) {
    try {
      const piexif = (await import("piexifjs")).default;
      const outDataUrl = await blobToDataUrl(outBlob);
      const merged = piexif.insert(exifBytes, outDataUrl);
      outBlob = dataUrlToBlob(merged);
      log("compress.exif-restored", { size: outBlob.size });
    } catch (err) {
      warn("compress.exif-inject-failed", err);
    }
  }

  const outName = retypeName(file.name);
  const out = new File([outBlob], outName, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
  log("compress.done", {
    ms: Math.round(performance.now() - t0),
    inSize: file.size,
    outSize: out.size,
    quality: usedQuality,
  });
  return out;
}

function countTags(exif: Record<string, unknown>): number {
  let n = 0;
  for (const k of Object.keys(exif)) {
    const v = exif[k];
    if (v && typeof v === "object") n += Object.keys(v).length;
  }
  return n;
}

async function fileToBitmap(
  file: File,
): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through.
    }
  }
  return await loadHTMLImage(file);
}

function loadHTMLImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      type,
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(meta)?.[1] ?? "image/jpeg";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function retypeName(name: string): string {
  return name.replace(/\.[^.]+$/, "") + ".jpg";
}
