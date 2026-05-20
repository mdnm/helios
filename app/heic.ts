"use client";

// Client-side HEIC → JPEG conversion that preserves the EXIF data the
// server's extract-location tool needs (GPS lat/lon).

export async function isHeicFile(file: File): Promise<boolean> {
  if (file.type === "image/heic" || file.type === "image/heif") return true;
  if (/\.(heic|heif)$/i.test(file.name)) return true;
  const { isHeic } = await import("heic-to/next");
  try {
    return await isHeic(file);
  } catch {
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
  const [{ heicTo }, exifrMod, piexifMod] = await Promise.all([
    import("heic-to/next"),
    import("exifr"),
    import("piexifjs"),
  ]);
  const piexif = piexifMod.default;
  const exifrParse: (
    data: File,
    opts: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | null | undefined> =
    (exifrMod as unknown as { parse: typeof exifrParse }).parse;

  // Read the EXIF we care about BEFORE conversion (heic-to strips it).
  let parsed: GpsLikeExif | null = null;
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
  } catch {
    parsed = null;
  }

  const jpegBlob = (await heicTo({
    blob: file,
    type: "image/jpeg",
    quality: 0.92,
  })) as Blob;

  const outName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  const bare = () =>
    new File([jpegBlob], outName, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });

  if (!parsed) return bare();

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
      return bare();
    }

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

    return new File([newBlob], outName, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch (err) {
    console.warn("EXIF injection failed; returning JPEG without EXIF", err);
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
