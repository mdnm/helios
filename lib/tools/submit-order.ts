import { tool } from "ai";
import { z } from "zod";
import Stripe from "stripe";
import { BALKONKRAFTWERK_CONFIGS } from "./get-products";

const MOCK_STRIPE = process.env.MOCK_STRIPE !== "false";

// Only construct a real Stripe client when we actually need it.
const stripe = MOCK_STRIPE
  ? null
  : new Stripe(process.env.STRIPE_SECRET_KEY!);

const JOURNEY_ID = "56020690-5456-11f1-9d3a-f10cf60e5f3b";
const ORG_ID = "20000697";
const SUBMISSION_API =
  "https://submission.sls.epilot.io/v1/submission/submissions";
const ENTITY_API = "https://entity.sls.epilot.io/v1/entity";
const DEFAULT_CONTACT_ID = "d2ad9086-35cb-496f-a083-578a71d74d98";

async function fetchContact(contactId: string) {
  const res = await fetch(`${ENTITY_API}/contact/${contactId}`, {
    headers: { Authorization: `Bearer ${process.env.EPILOT_API_TOKEN}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const e = data.entity ?? data;
  const addr = e.address?.[0] ?? {};
  return {
    firstName: e.first_name ?? "",
    lastName: e.last_name ?? "",
    email: e.email?.[0]?.email ?? "",
    telephone: e.phone?.[0]?.phone ?? "",
    salutation: e.salutation ?? "Mr.",
    streetName: addr.street ?? "",
    houseNumber: addr.street_number ?? "",
    zipCode: addr.postal_code ?? "",
    city: addr.city ?? "",
  };
}

export const submitOrder = tool({
  description:
    "Submit a real order for a Balkonkraftwerk. Uses the existing customer from epilot by default. Only pass contact fields if the customer explicitly provides different details.",
  inputSchema: z.object({
    productId: z
      .enum(["starter", "battery", "smart"])
      .describe("The product configuration ID the customer selected"),
    contactId: z
      .string()
      .optional()
      .describe(
        "epilot contact entity ID. Defaults to the known demo customer."
      ),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    telephone: z.string().optional(),
    streetName: z.string().optional(),
    houseNumber: z.string().optional(),
    zipCode: z.string().optional(),
    city: z.string().optional(),
  }),
  execute: async (input) => {
    try {
      const config = BALKONKRAFTWERK_CONFIGS.find(
        (c) => c.id === input.productId
      );
      if (!config) {
        return { error: `Unknown product: ${input.productId}` };
      }

      const cid = input.contactId ?? DEFAULT_CONTACT_ID;
      const contact = await fetchContact(cid);
      if (!contact) {
        return { error: `Could not fetch contact ${cid}` };
      }

      const firstName = input.firstName ?? contact.firstName;
      const lastName = input.lastName ?? contact.lastName;
      const email = input.email ?? contact.email;
      const telephone = input.telephone ?? contact.telephone;
      const streetName = input.streetName ?? contact.streetName;
      const houseNumber = input.houseNumber ?? contact.houseNumber;
      const zipCode = input.zipCode ?? contact.zipCode;
      const city = input.city ?? contact.city;

      const address = {
        countryCode: "DE",
        city,
        zipCode,
        streetName,
        houseNumber,
      };

      const submissionPayload = {
        organization_id: ORG_ID,
        source_type: "journey",
        source_id: JOURNEY_ID,
        entities: [
          {
            _schema: "submission",
            _title: `Journey: Balkonkraftwerk B2C`,
            source_type: "journey",
            source_id: JOURNEY_ID,
            journey_name: "Balkonkraftwerk B2C",
            submission_type: "direct_sale",
            runtime_entities: ["ORDER"],
            steps: [
              { Montageort: "Gitterbalkon" },
              { "Gitterbalkon - Neigung": "senkrecht" },
              {
                Produktauswahl: [
                  {
                    product: {
                      selectedProductId: config.epilotProductId,
                      selectedPriceId: config.epilotPriceId,
                      selectionMetadata: {
                        selectedPrice: {
                          _id: config.epilotPriceId,
                          unit_amount: config.price * 100,
                          unit_amount_currency: "EUR",
                          unit_amount_decimal: String(config.price),
                          is_tax_inclusive: true,
                          pricing_model: "per_unit",
                          type: "one_time",
                          tax: [{ rate: 0 }],
                        },
                        selectedProduct: {
                          _id: config.epilotProductId,
                          name: config.name,
                        },
                        selectedCoupons: [],
                      },
                    },
                    quantity: 1,
                  },
                ],
              },
              {},
              {
                "Persönliche Informationen": {
                  salutation: contact.salutation,
                  firstName,
                  lastName,
                  email,
                  telephone,
                },
                Installationsadresse: address,
                "Rechnungsadresse stimmt mit Installationsadresse überein": true,
                "Abweichende Rechnungsadresse": address,
              },
              { Lieferung: "Selbstabholung" },
              {
                Zahlungsdetails: {
                  type: "payment_stripe",
                  label: "Stripe Checkout",
                  _isValid: true,
                },
              },
              {
                Einwilligungen: {
                  GTC: {
                    agreed: true,
                    topic: "GTC",
                    text: "Ich stimme den Allgemeinen Geschäftsbedingungen zu.",
                    time: new Date().toISOString(),
                  },
                  _isValid: true,
                },
              },
              {},
            ],
            _historyIndexes: [0, 1, 2, 4, 5, 6, 7],
            line_items: [
              {
                product: {
                  selectedProductId: config.epilotProductId,
                  selectedPriceId: config.epilotPriceId,
                  selectionMetadata: {
                    selectedPrice: {
                      _id: config.epilotPriceId,
                      unit_amount: config.price * 100,
                      unit_amount_currency: "EUR",
                      unit_amount_decimal: String(config.price),
                      is_tax_inclusive: true,
                      pricing_model: "per_unit",
                      type: "one_time",
                      tax: [{ rate: 0 }],
                    },
                    selectedProduct: {
                      _id: config.epilotProductId,
                      name: config.name,
                    },
                  },
                },
                quantity: 1,
              },
            ],
            delivery_address: address,
            billing_address: address,
            payment_method: {
              type: "payment_stripe",
              label: "Stripe Checkout",
            },
          },
        ],
      };

      const submissionRes = await fetch(SUBMISSION_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.EPILOT_JOURNEY_PUBLIC_TOKEN}`,
        },
        body: JSON.stringify(submissionPayload),
      });

      if (!submissionRes.ok) {
        const text = await submissionRes.text();
        return {
          error: `epilot submission failed: ${submissionRes.status} ${text}`,
        };
      }

      const submissionText = await submissionRes.text();
      let submissionId = "unknown";
      if (submissionText) {
        try {
          const submissionData = JSON.parse(submissionText);
          submissionId =
            submissionData?.entities?.[0]?._id ??
            submissionData?._id ??
            "unknown";
        } catch {
          // 201 with empty or non-JSON body
        }
      }

      let clientSecret: string;
      if (stripe) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: config.price * 100,
          currency: "eur",
          receipt_email: email,
          metadata: {
            epilot_submission_id: submissionId,
            product_name: config.name,
          },
        });
        clientSecret = paymentIntent.client_secret ?? "";
      } else {
        // Mock mode: fabricate a recognizable clientSecret so the frontend
        // routes to the mock checkout component.
        clientSecret = `mock_pi_${Date.now()}_secret_${Math.random()
          .toString(36)
          .slice(2)}`;
      }

      return {
        clientSecret,
        submissionId,
        productName: config.name,
        price: config.price,
        customerName: `${firstName} ${lastName}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("submitOrder error:", err);
      return { error: `Order submission failed: ${message}` };
    }
  },
});
