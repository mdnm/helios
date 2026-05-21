# ADR 003: PaymentIntents over Stripe Checkout Sessions

**Status:** Approved

## Context

ADR-002 specified Stripe Embedded Checkout (`<EmbeddedCheckout>` with `checkout.sessions.create({ ui_mode: 'embedded' })`). When implemented, the Checkout Session UI rendered as a Stripe-branded iframe with its own fonts, colors, and layout — visually jarring inside the Helios chat conversation. The rest of the app is a single-thread chat; an iframe with a different design language broke the illusion that the customer never left the conversation.

## Decision

Replace Stripe Checkout Sessions with the PaymentIntents API (`stripe.paymentIntents.create`) and render payment collection using Stripe's `<PaymentElement>` on the client side.

- The server creates a PaymentIntent with the order amount and returns the `clientSecret`.
- The frontend renders `<PaymentElement>` inline in the chat, styled to match the conversation UI.
- The webhook listens for `payment_intent.succeeded` (not `checkout.session.completed`).

## Alternatives Considered

- **Keep Embedded Checkout, override styles:** Stripe's embedded checkout iframe is not style-customizable beyond logo and accent color. The mismatch would remain.
- **Redirect Checkout:** Already rejected in ADR-002 — sends the customer away from the chat.
- **Custom card form (`<CardElement>`):** More control but requires handling individual payment method types manually. `<PaymentElement>` gives the same visual control while supporting all payment methods Stripe enables on the account.

## Consequences

### Positive
- **Visual coherence:** The payment form looks like part of the chat, not an embedded third-party page.
- **Full style control:** Stripe Elements' `appearance` API lets us match fonts, colors, borders, and spacing to the rest of the UI.
- **Same payment methods:** `<PaymentElement>` dynamically renders whatever methods are enabled in the Stripe Dashboard — no code changes needed to add SEPA, Klarna, etc.

### Negative
- **Higher PCI scope:** With Checkout Sessions, Stripe hosts the entire payment form. With Elements, card data still goes directly to Stripe (tokenized), but we own the form rendering — SAQ-A-EP instead of SAQ-A.
- **More client-side code:** We manage form state, validation errors, and the `confirmPayment` call ourselves instead of delegating to Stripe's hosted UI.

## Implementation

### Changed from ADR-002
- `lib/tools/submit-order.ts` — `stripe.paymentIntents.create()` replaces `stripe.checkout.sessions.create()`
- `app/api/webhooks/stripe/route.ts` — handles `payment_intent.succeeded` instead of `checkout.session.completed`
- `app/page.tsx` — `<PaymentElement>` with Stripe Elements `appearance` API instead of `<EmbeddedCheckout>`
