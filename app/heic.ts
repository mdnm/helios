"use client";

import { log, warn } from "./log";

// Client-side HEIC → JPEG conversion that preserves the EXIF data the
// server's extract-location tool needs (GPS lat/lon).

export async function isHeicFile(file: File): Promise<boolean> {
  if (file.type === "image/heic" || file.type === "image/heif") {
    log("heic.detect.mime", { type: file.type });
    return true;
  }
  if (/\.(heic|heif)$/i.test(file.name)) {
    log("heic.detect.extension", { name: file.name });
    return true;
  }
  const { isHeic } = await import("heic-to/next");
  try {
    const result = await isHeic(file);
    log("heic.detect.signature", { name: file.name, result });
    return result;
  } catch (err) {
    warn("heic.detect.error", err);
    return false;
  }
}

type GpsLikeExif = {
  latitude?: number;
  longitude?: number;
  GPSAltitude?: number;
  GPSAltitudeRef?: number;
  Orientation?: number;
  DateTimeOriginal?: Date | string;
  Make?: string;
  Model?: string;
};

export async function convertHeicToJpeg(file: File): Promise<File> {
  const tStart = performance.now();
  log("heic.convert.start", { name: file.name, size: file.size });

  const tDeps = performance.now();
  const [{ heicTo }, exifrMod, piexifMod] = await Promise.all([
    import("heic-to/next"),
    import("exifr"),
    import("piexifjs"),
  ]);
  log("heic.convert.deps-loaded", {
    ms: Math.round(performance.now() - tDeps),
  });
  const piexif = piexifMod.default;
  const exifrParse: (
    data: File,
    opts: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | null | undefined> =
    (exifrMod as unknown as { parse: typeof exifrParse }).parse;

  // Read the EXIF we care about BEFORE conversion (heic-to strips it).
  let parsed: GpsLikeExif | null = null;
  const tExif = performance.now();
  try {
    const result = await exifrParse(file, {
      gps: true,
      pick: [
        "Orientation",
        "DateTimeOriginal",
        "Make",
        "Model",
        "GPSAltitude",
        "GPSAltitudeRef",
      ],
    });
    parsed = (result ?? null) as GpsLikeExif | null;
    log("heic.convert.exif-read", {
      ms: Math.round(performance.now() - tExif),
      hasGps:
        typeof parsed?.latitude === "number" &&
        typeof parsed?.longitude === "number",
      tags: parsed ? Object.keys(parsed) : [],
    });
  } catch (err) {
    warn("heic.convert.exif-read-failed", err);
    parsed = null;
  }

  const tDecode = performance.now();
  const jpegBlob = (await heicTo({
    blob: file,
    type: "image/jpeg",
    quality: 0.92,
  })) as Blob;
  log("heic.convert.decoded", {
    ms: Math.round(performance.now() - tDecode),
    jpegSize: jpegBlob.size,
  });

  const outName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  const bare = () =>
    new File([jpegBlob], outName, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });

  if (!parsed) {
    log("heic.convert.done", {
      ms: Math.round(performance.now() - tStart),
      exifPreserved: false,
    });
    return bare();
  }

  try {
    type ExifValue = string | number | [number, number] | [number, number][];
    const zeroth: Record<number, ExifValue> = {};
    const exifIfd: Record<number, ExifValue> = {};
    const gps: Record<number, ExifValue> = {};

    if (parsed.Orientation)
      zeroth[piexif.ImageIFD.Orientation] = parsed.Orientation;
    if (parsed.Make) zeroth[piexif.ImageIFD.Make] = parsed.Make;
    if (parsed.Model) zeroth[piexif.ImageIFD.Model] = parsed.Model;

    if (parsed.DateTimeOriginal) {
      const dt =
        parsed.DateTimeOriginal instanceof Date
          ? formatExifDate(parsed.DateTimeOriginal)
          : String(parsed.DateTimeOriginal);
      exifIfd[piexif.ExifIFD.DateTimeOriginal] = dt;
    }

    if (
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number"
    ) {
      gps[piexif.GPSIFD.GPSLatitudeRef] = parsed.latitude >= 0 ? "N" : "S";
      gps[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(
        Math.abs(parsed.latitude),
      );
      gps[piexif.GPSIFD.GPSLongitudeRef] = parsed.longitude >= 0 ? "E" : "W";
      gps[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(
        Math.abs(parsed.longitude),
      );
      if (typeof parsed.GPSAltitude === "number") {
        gps[piexif.GPSIFD.GPSAltitudeRef] = parsed.GPSAltitudeRef ?? 0;
        gps[piexif.GPSIFD.GPSAltitude] = [
          Math.round(parsed.GPSAltitude * 100),
          100,
        ];
      }
    }

    if (
      Object.keys(zeroth).length === 0 &&
      Object.keys(exifIfd).length === 0 &&
      Object.keys(gps).length === 0
    ) {
      log("heic.convert.no-tags", {
        ms: Math.round(performance.now() - tStart),
      });
      return bare();
    }
    log("heic.convert.exif-built", {
      zerothTags: Object.keys(zeroth).length,
      exifTags: Object.keys(exifIfd).length,
      gpsTags: Object.keys(gps).length,
    });

    const exifObj = {
      "0th": zeroth,
      Exif: exifIfd,
      GPS: gps,
      Interop: {},
      "1st": {},
      thumbnail: null,
    };

    const exifBytes = piexif.dump(exifObj);
    const jpegDataUrl = await blobToDataUrl(jpegBlob);
    const newJpegDataUrl = piexif.insert(exifBytes, jpegDataUrl);
    const newBlob = dataUrlToBlob(newJpegDataUrl);

    const out = new File([newBlob], outName, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
    log("heic.convert.done", {
      ms: Math.round(performance.now() - tStart),
      exifPreserved: true,
      outSize: out.size,
    });
    return out;
  } catch (err) {
    warn("heic.convert.exif-inject-failed", err);
    return bare();
  }
}

function formatExifDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}:${p(d.getMonth() + 1)}:${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
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
