import { tool } from "ai";
import { z } from "zod";
import ExifParser from "exif-parser";

// Demo default — Cologne. Used when an uploaded photo has no EXIF GPS
// (iPhone share-sheets strip it, screenshots never have it, etc.) so the
// assistant doesn't have to interrupt the flow to ask for an address.
const DEFAULT_LOCATION = {
  city: "Köln",
  postcode: "50672",
  region: "central" as const,
};

export const extractLocation = tool({
  description:
    "Extract GPS location from an uploaded photo's EXIF data. Always returns a location: real GPS if present, otherwise the demo default (Köln). Never errors — always treat the result as the user's location.",
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

        // For the demo, map coordinates roughly to Cologne.
        // In production, this would reverse-geocode.
        if (lat > 50.5 && lat < 51.2 && lon > 6.5 && lon < 7.2) {
          return {
            ...DEFAULT_LOCATION,
            source: "exif" as const,
            coordinates: { lat, lon },
          };
        }

        // GPS found but outside the demo region — still return the default
        // location alongside the coordinates so the assistant has something
        // concrete to use without asking.
        return {
          ...DEFAULT_LOCATION,
          source: "exif-outside-demo" as const,
          coordinates: { lat, lon },
        };
      }

      return { ...DEFAULT_LOCATION, source: "default" as const };
    } catch {
      return { ...DEFAULT_LOCATION, source: "default" as const };
    }
  },
});
