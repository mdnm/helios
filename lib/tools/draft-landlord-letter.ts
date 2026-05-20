import { tool } from "ai";
import { z } from "zod";

export const draftLandlordLetter = tool({
  description:
    "Draft a formal landlord or WEG notification letter for installing a Balkonkraftwerk. Only use when: (1) the customer is renting AND (2) the installation alters the building facade (balcony railing mount, wall mount). Do NOT use for roof installs or non-facade-altering setups.",
  inputSchema: z.object({
    housingType: z
      .enum(["tenant", "weg_owner"])
      .describe("Whether writing to landlord (tenant) or WEG (owner)"),
    tenantName: z.string().describe("Name of the tenant/owner"),
    address: z.string().describe("Full address of the apartment"),
    equipmentSummary: z
      .string()
      .describe(
        'Brief description of the equipment (e.g. "2× Solakon 450 Wp modules, Hoymiles 800W inverter, Solakon ONE battery")'
      ),
  }),
  execute: async ({ housingType, tenantName, address, equipmentSummary }) => {
    if (housingType === "tenant") {
      return {
        subject:
          "Mitteilung über die Installation eines Steckersolargeräts (Balkonkraftwerk)",
        letter: `Sehr geehrte/r Vermieter/in,

hiermit informiere ich Sie gemäß § 554 BGB über meine geplante Installation eines Steckersolargeräts (umgangssprachlich "Balkonkraftwerk") an meinem Balkon in der Wohnung ${address}.

Geplante Anlage:
- ${equipmentSummary}
- Wechselrichterleistung: 800 W (gesetzliche Obergrenze)
- Montage: außen am Balkongeländer, mit windlastgeprüften Halterungen
- Anschluss: bestehende Außensteckdose / Schuko
- Anmeldung im Marktstammdatenregister (MaStR): erfolgt innerhalb eines Monats nach Inbetriebnahme

Die Anlage entspricht der Produktnorm DIN VDE V 0126-95 und ist CE-zertifiziert. Bei einem Auszug entferne ich die Anlage rückstandsfrei. Eine optische Beeinträchtigung der Fassade entsteht nicht über das durch die Norm und das Mietrecht zulässige Maß hinaus.

Über eine kurze Bestätigung Ihrerseits, idealerweise innerhalb von vier Wochen, würde ich mich freuen. Für Rückfragen stehe ich gerne zur Verfügung.

Mit freundlichen Grüßen
${tenantName}`,
        notes: [
          "Send via email if relations are good, Einschreiben mit Rückschein if strained",
          "No response after 4–6 weeks can be treated as implicit acceptance",
          "Do NOT install before sending this notification",
        ],
      };
    }

    return {
      subject:
        "Anzeige einer privilegierten baulichen Maßnahme — Steckersolargerät am Balkon",
      letter: `Sehr geehrte Damen und Herren,

hiermit zeige ich gemäß § 20 Abs. 2 Nr. 5 WEG die geplante Installation eines Steckersolargeräts an meinem Sondernutzungsbalkon der Wohnung ${address} an. Steckersolargeräte gehören seit der WEG-Novelle 2024 zu den privilegierten Maßnahmen.

Geplante Anlage:
- ${equipmentSummary}
- Wechselrichterleistung: 800 W (gesetzliche Obergrenze)

Die Installation erfolgt fachgerecht und reversibel. Beeinträchtigungen des Gemeinschaftseigentums entstehen nicht. Ich bitte um Aufnahme des Vorgangs in die nächste Eigentümerversammlung lediglich zur Kenntnisnahme.

Mit freundlichen Grüßen
${tenantName}`,
      notes: [
        "A WEG cannot refuse without substantial reason (Denkmalschutz, structural concerns)",
        "Aesthetic preference is NOT a valid refusal reason since 2024",
      ],
    };
  },
});
