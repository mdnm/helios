declare module "piexifjs" {
  type ExifValue = string | number | number[] | [number, number] | [number, number][];

  interface ExifObject {
    "0th"?: Record<number, ExifValue>;
    Exif?: Record<number, ExifValue>;
    GPS?: Record<number, ExifValue>;
    Interop?: Record<number, ExifValue>;
    "1st"?: Record<number, ExifValue>;
    thumbnail?: string | null;
  }

  interface IFDTagMap {
    [key: string]: number;
  }

  interface Piexif {
    load(jpegData: string): ExifObject;
    dump(exifObj: ExifObject): string;
    insert(exifStr: string, jpegData: string): string;
    remove(jpegData: string): string;

    ImageIFD: IFDTagMap;
    ExifIFD: IFDTagMap;
    GPSIFD: IFDTagMap;
    InteropIFD: IFDTagMap;

    GPSHelper: {
      degToDmsRational(deg: number): [number, number][];
      dmsRationalToDeg(
        dms: [number, number][],
        ref: string,
      ): number;
    };
  }

  const piexif: Piexif;
  export default piexif;
  export = piexif;
}
