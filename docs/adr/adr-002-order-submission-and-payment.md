# ADR 002: Order Submission via epilot Journey API + Stripe Embedded Checkout

**Status:** Approved

## Context

Helios can guide customers through product selection and ROI calculation, but cannot actually place an order. When a customer says "I want to buy this", the agent admits it's a demo and fabricates a fake confirmation. This breaks immersion and undermines the platform story — Helios should complete the sale end-to-end.

The epilot platform already has a Journey Submission API that creates orders, contacts, and triggers workflows through automations. There is a configured journey (`56020690-5456-11f1-9d3a-f10cf60e5f3b`, org `20000697`) with three Balkonkraftwerk products and entity mappings that create Order and Contact entities on submission.

## Decision

### Order Flow

Helios places real orders through a new `submitOrder` tool that:

1. **Submits to epilot** via the Journey Submission API (`POST /v1/submission/submissions`) using the journey's public token. The order lands in epilot 360 with status "pending payment".
2. **Creates a Stripe Checkout Session** with `ui_mode: 'embedded'`, the selected product, and the customer's email pre-filled. The epilot submission ID is stored in `metadata.epilot_submission_id` and the Stripe session ID is included in the epilot submission payload for cross-referencing.
3. **Returns `{ clientSecret }`** to the frontend.

The frontend renders `<EmbeddedCheckout>` from `@stripe/react-stripe-js` inline in the chat conversation. The customer pays without leaving the app. On `onComplete` callback, the checkout component is replaced with a confirmation message.

### Payment Confirmation

A webhook endpoint (`/api/webhooks/stripe`) handles `checkout.session.completed`:
- Verifies the Stripe webhook signature
- Reads `metadata.epilot_submission_id`
- Finds the related order in epilot and updates its status from "pending payment" to "paid"

### Product Mapping

The three Helios product configs map 1:1 to real epilot entities and will be mirrored in Stripe:

| Config | epilot Product ID | epilot Price ID | Price |
|---|---|---|---|
| Starter — Panels Only | `930d833b-30ba-48bb-93e8-4091dcc00a67` | `7cf924d5-d28f-4ac7-b613-5df207140950` | €400 |
| Standard + Battery | `c398ff4a-834e-43ea-bd7a-deda0687874c` | `97607400-69ef-4219-b688-1ee28231903c` | €900 |
| Maximum — Battery + Smart Meter | `e22352b4-6645-4d5e-9975-88721638e968` | `b382300b-db42-475e-b2c1-60925a1e57bd` | €950 |

### Contact Fields Collected

Required by the journey's entity mappings:
- `firstName`, `lastName`, `email`, `telephone`
- Installation address: `streetName`, `houseNumber`, `zipCode`, `city`
- `countryCode` hardcoded to `DE`

Dropped for demo: `birthDate` (removed from journey config), `salutation` (defaulted).

### Authentication

- **Submission API:** Journey public token (scoped to submission creation, same as a real journey frontend)
- **Webhook → epilot update:** epilot API service token stored in `EPILOT_API_TOKEN` env var

### System Prompt

All demo/limitation language removed. The "After selection" phase instructs Helios to collect remaining contact info and call `submitOrder`. The prompt mentions nothing about Stripe — it just says "place the order" and the tool handles mechanics.

## Alternatives Considered

- **Stripe Payment Links (static URLs per product):** Simpler but sends the customer away from the chat. Worse demo experience and limits future flexibility (no dynamic line items, no pre-filled email).
- **Stripe redirect Checkout (not embedded):** Same redirect problem. Customer leaves the conversation flow.
- **Submit to epilot only after Stripe payment confirms:** Cleaner data (no unpaid orders) but requires a webhook → submission chain. Loses the "watch the order appear in epilot 360 in real time" demo moment.
- **Create epilot Order entity directly (skip journey submission):** Would bypass the journey's automation layer (workflows, emails, entity mappings). More code, less reusable.
- **Payment via "Zahlung per Rechnung" (invoice):** No real payment captured. Stripe Checkout is more impressive for the demo and proves the full transaction loop.

## Consequences

### Positive
- **End-to-end real:** Customer talks → selects product → pays → order appears in epilot 360 with correct status, contact, and workflow. No fakery.
- **Embedded payment:** Customer never leaves the chat. Strong demo moment.
- **Reuses epilot automations:** The journey's existing entity mappings, workflows, and email confirmations all fire automatically.
- **Cross-referenced:** Stripe session ID in epilot submission + epilot submission ID in Stripe metadata. Full traceability.

### Negative
- **Two external dependencies:** Both epilot Submission API and Stripe must be reachable. Either going down breaks ordering.
- **Async order creation:** The epilot order entity is created by automation, not synchronously by the submission API. The webhook must search for the related order rather than updating it directly.
- **Stripe products must be kept in sync:** Three products exist in both epilot and Stripe with separate IDs. A product change requires updating both systems.

## Implementation

### New files
- `lib/tools/submit-order.ts` — the `submitOrder` tool
- `app/api/webhooks/stripe/route.ts` — Stripe webhook handler
- Chat UI component for rendering `<EmbeddedCheckout>` on tool result

### Modified files
- `lib/system-prompt.ts` — remove demo language, add ordering phase instructions
- `lib/tools/get-products.ts` — add epilot entity IDs and Stripe product/price IDs to configs
- `app/api/chat/route.ts` — register `submitOrder` tool
- `app/page.tsx` — handle `submitOrder` tool result rendering

### Environment variables
- `STRIPE_SECRET_KEY` — Stripe test secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key (client-side)
- `EPILOT_API_TOKEN` — epilot service token for webhook updates
- `EPILOT_JOURNEY_PUBLIC_TOKEN` — journey public token for submissions

### Stripe setup
- Create 3 products + prices in Stripe sandbox matching the epilot catalog
- Register webhook endpoint for `checkout.session.completed`
