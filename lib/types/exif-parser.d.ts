declare module "exif-parser" {
  interface ExifTags {
    GPSLatitude?: number;
    GPSLongitude?: number;
    [key: string]: unknown;
  }
  interface ExifResult {
    tags: ExifTags;
  }
  interface ExifParserInstance {
    parse(): ExifResult;
  }
  const ExifParser: {
    create(buffer: Buffer): ExifParserInstance;
  };
  export default ExifParser;
}
