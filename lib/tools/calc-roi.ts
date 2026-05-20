import { tool } from "ai";
import { z } from "zod";
import { computeRoi } from "../roi";

export const calcRoi = tool({
  description:
    "Calculate ROI for a Balkonkraftwerk configuration. Returns payback period, 25-year net savings, and consumption coverage. Always use this for any financial calculations — never compute numbers manually.",
  inputSchema: z.object({
    kwp: z.number().describe("Total module power in kWp (e.g. 0.9 for 900 Wp)"),
    region: z
      .string()
      .describe('City name or region (e.g. "Köln", "central", "München")'),
    orientation: z
      .string()
      .describe("Balcony orientation: S, SE, SW, E, W, NE, NW, N"),
    consumptionKwh: z
      .number()
      .describe("Annual household consumption in kWh"),
    selfConsumption: z
      .number()
      .describe(
        "Self-consumption rate: 0.35 (no battery), 0.65 (battery), 0.92 (battery + smart meter)"
      ),
    electricityPrice: z
      .number()
      .describe("Electricity price in €/kWh (e.g. 0.34)"),
    hardwareCost: z.number().describe("Total hardware cost in €"),
    subsidy: z.number().describe("Subsidy amount in €"),
  }),
  execute: async ({
    kwp,
    region,
    orientation,
    consumptionKwh,
    selfConsumption,
    electricityPrice,
    hardwareCost,
    subsidy,
  }) => {
    return computeRoi({
      kwp,
      region,
      orientation,
      consumptionKwh,
      selfConsumption,
      pricePerKwh: electricityPrice,
      hardwareCost,
      subsidy,
    });
  },
});
