import { tool } from "ai";
import { z } from "zod";

const BALKONKRAFTWERK_CONFIGS = [
  {
    id: "starter",
    name: "Starter — Panels Only",
    modules: "2× Solakon 450 Wp",
    totalWp: 900,
    inverter: "Hoymiles HMS-800W-2T (800 W AC)",
    battery: null,
    smartMeter: null,
    mounting: "Standard universal clamps for round bar railing",
    connection: "Schuko (standard household plug)",
    price: 400,
    selfConsumptionRate: 0.35,
    bestFor:
      "Small consumption (~1,500 kWh/year), person who is home during the day, tight budget",
  },
  {
    id: "battery",
    name: "Standard + Battery",
    modules: "2× Solakon 450 Wp",
    totalWp: 900,
    inverter: "Hoymiles HMS-800W-2T (800 W AC)",
    battery: "Solakon ONE 2.11 kWh (LiFePO4, expandable to 12.7 kWh)",
    smartMeter: null,
    mounting: "Standard universal clamps for round bar railing",
    connection: "Schuko (standard household plug)",
    price: 900,
    selfConsumptionRate: 0.65,
    bestFor:
      "Average household (2,000–3,000 kWh/year), away from home during daytime",
  },
  {
    id: "smart",
    name: "Maximum — Battery + Smart Meter",
    modules: "2× Solakon 450 Wp",
    totalWp: 900,
    inverter: "Hoymiles HMS-800W-2T (800 W AC)",
    battery: "Solakon ONE 2.11 kWh (LiFePO4, expandable to 12.7 kWh)",
    smartMeter:
      "Solakon PowerTracker IR (magnet-mount on digital meter, no electrician needed)",
    mounting: "Standard universal clamps for round bar railing",
    connection: "Schuko (standard household plug)",
    price: 950,
    selfConsumptionRate: 0.92,
    bestFor:
      "Any household wanting maximum savings, especially daytime-away households",
  },
];

export const getProducts = tool({
  description:
    "Retrieve available Balkonkraftwerk product configurations. Returns 3 options: starter (panels only), with battery, and with battery + smart meter.",
  inputSchema: z.object({
    category: z
      .string()
      .describe('Product category, e.g. "balkonkraftwerk" or "ev_wallbox"'),
  }),
  execute: async ({ category }) => {
    if (category.toLowerCase().includes("balkon")) {
      return { products: BALKONKRAFTWERK_CONFIGS };
    }
    return {
      products: [],
      message: `No products configured for category "${category}" yet. This is coming soon!`,
    };
  },
});
