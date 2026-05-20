import { tool } from "ai";
import { z } from "zod";
import ExifParser from "exif-parser";

export const extractLocation = tool({
  description:
    "Extract GPS location from an uploaded photo's EXIF data. Returns city and postcode if coordinates are found.",
  inputSchema: z.object({
    imageBase64: z
      .string()
      .describe("Base64-encoded image data from the uploaded photo"),
  }),
  execute: async ({ imageBase64 }) => {
    try {
      const buffer = Buffer.from(imageBase64, "base64");
      const parser = ExifParser.create(buffer);
      const result = parser.parse();

      if (result.tags?.GPSLatitude && result.tags?.GPSLongitude) {
        const lat = result.tags.GPSLatitude;
        const lon = result.tags.GPSLongitude;

        // For the demo, map coordinates roughly to Cologne
        // In production, this would reverse-geocode
        if (lat > 50.5 && lat < 51.2 && lon > 6.5 && lon < 7.2) {
          return {
            city: "Köln",
            postcode: "50672",
            region: "central",
            coordinates: { lat, lon },
          };
        }

        return {
          city: "Unknown",
          postcode: "Unknown",
          region: "central",
          coordinates: { lat, lon },
        };
      }

      return { error: "No GPS data found in image EXIF" };
    } catch {
      return { error: "Could not parse EXIF data from image" };
    }
  },
});
