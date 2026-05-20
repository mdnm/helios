import { tool } from "ai";
import { z } from "zod";

export const extractConsumption = tool({
  description:
    "Record the annual electricity consumption (kWh) extracted from a bill screenshot. The model reads the bill image in conversation context and calls this tool to formalize the number.",
  inputSchema: z.object({
    yearlyKwh: z
      .number()
      .describe("Annual electricity consumption in kWh as read from the bill"),
    electricityPriceCtPerKwh: z
      .number()
      .optional()
      .describe("Electricity price in ct/kWh if visible on the bill"),
  }),
  execute: async ({ yearlyKwh, electricityPriceCtPerKwh }) => {
    return {
      yearlyKwh,
      electricityPricePerKwh: electricityPriceCtPerKwh
        ? electricityPriceCtPerKwh / 100
        : 0.34,
      householdEstimate:
        yearlyKwh < 1800
          ? "single person"
          : yearlyKwh < 3000
            ? "couple"
            : yearlyKwh < 4500
              ? "small family"
              : "large family",
    };
  },
});
