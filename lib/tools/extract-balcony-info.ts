import { tool } from "ai";
import { z } from "zod";

const MOCKED_CASES = {
  A: {
    case: "A — ideal",
    dimensions: { width: 4.0, unit: "m" },
    orientation: "S",
    railingType: "round bars",
    fitsModules: 2,
    moduleType: "full-size (175×113 cm)",
    notes: "Excellent setup. South-facing, fits 2 full-size modules with standard clamp mounts.",
  },
  B: {
    case: "B — compact",
    dimensions: { width: 2.5, unit: "m" },
    orientation: "SW",
    railingType: "glass",
    fitsModules: 2,
    moduleType: "compact (150×75 cm)",
    notes: "Good setup. South-west facing, fits 2 compact modules. Glass railing requires floor-mount frame instead of clamps.",
  },
  C: {
    case: "C — challenging",
    dimensions: { width: 3.0, unit: "m" },
    orientation: "E",
    railingType: "concrete parapet",
    fitsModules: 2,
    moduleType: "full-size (175×113 cm)",
    notes: "Decent space but east-facing reduces yield by ~22%. Concrete parapet needs wall anchors or freestanding tilt frame.",
  },
};

export const extractBalconyInfo = tool({
  description:
    "Analyze a balcony photo to determine dimensions, orientation, railing type, and how many solar modules will fit. Call this when the user uploads a balcony photo.",
  inputSchema: z.object({
    photoDescription: z
      .string()
      .describe("Brief description of what the photo shows"),
  }),
  execute: async () => {
    // Demo: always return Case A (south-facing ideal balcony)
    return MOCKED_CASES.A;
  },
});
