import { tool } from "ai";
import { z } from "zod";

export const getSubsidies = tool({
  description:
    "Look up available Balkonkraftwerk subsidies for a given German postcode or city. Returns subsidy programs with amounts and requirements.",
  inputSchema: z.object({
    postcode: z
      .string()
      .describe('Postcode or city name (e.g. "50672" or "Köln")'),
  }),
  execute: async ({ postcode }) => {
    const isCologne =
      postcode.startsWith("50") ||
      postcode.startsWith("51") ||
      postcode.toLowerCase().includes("köln") ||
      postcode.toLowerCase().includes("koeln") ||
      postcode.toLowerCase().includes("cologne");

    if (isCologne) {
      return {
        city: "Köln",
        subsidies: [
          {
            name: "Klimafreundliches Wohnen",
            amount: 150,
            maxAmount: 200,
            type: "flat rate per Wohneinheit",
            requirements: [
              "Application BEFORE purchase (Antrag vor Kauf)",
              "Proof of residence in Köln",
              "Invoice and MaStR registration confirmation after install",
            ],
            koelnPassAmount: 300,
            koelnPassNote:
              "Köln-Pass holders receive up to 300 € instead of 150–200 €",
            batteryEligible: false,
            batteryNote:
              "Battery storage for plug-in systems is explicitly excluded from this subsidy",
            status: "Active — check koeln.de for current pot status",
            applicationUrl: "koeln.de → Klimafreundliches Wohnen",
          },
        ],
        vatNote:
          "0% VAT (§ 12 Abs. 3 UStG) applies automatically — prices from German retailers already reflect this.",
        importantReminder:
          "Apply BEFORE purchasing. Buying first usually disqualifies you.",
      };
    }

    return {
      city: postcode,
      subsidies: [],
      message:
        "No subsidy data available for this location in the demo. In production, this would check the full German subsidy database.",
      vatNote:
        "0% VAT (§ 12 Abs. 3 UStG) applies automatically regardless of location.",
    };
  },
});
