import { tool } from "ai";
import { z } from "zod";

export const BALKONKRAFTWERK_CONFIGS = [
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
    epilotProductId: "930d833b-30ba-48bb-93e8-4091dcc00a67",
    epilotPriceId: "7cf924d5-d28f-4ac7-b613-5df207140950",
    stripeProductId: "prod_UYG2EKcNh92KzQ",
    stripePriceId: "price_1TZ9WcCxA0dNEl6OYjcKfO6y",
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
    epilotProductId: "c398ff4a-834e-43ea-bd7a-deda0687874c",
    epilotPriceId: "97607400-69ef-4219-b688-1ee28231903c",
    stripeProductId: "prod_UYG2WBGf7ADAFE",
    stripePriceId: "price_1TZ9WdCxA0dNEl6OxlyEQU2v",
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
    epilotProductId: "e22352b4-6645-4d5e-9975-88721638e968",
    epilotPriceId: "b382300b-db42-475e-b2c1-60925a1e57bd",
    stripeProductId: "prod_UYG2d0bpBU5SK1",
    stripePriceId: "price_1TZ9WeCxA0dNEl6OyqpT2mEi",
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
