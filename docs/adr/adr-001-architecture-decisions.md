# ADR 001: Helios Architecture for Hackathon Demo

**Status:** Approved

## Context

Helios is being built for the epilot hackathon (May 20–21, 2026) as a chat-first AI assistant that walks a customer through purchasing a Balkonkraftwerk in Cologne. The team has 1.5 days to build a working demo with a 5-minute scripted happy path and a 30-second EV charger tail pivot. Architecture decisions must optimize for speed-to-working-demo while remaining credible as a platform story.

## Decision

### Stack

We decided to build Helios as a **Next.js** application using the **Vercel AI SDK** with **Claude Sonnet 4.5** (`claude-sonnet-4-5-20250514`) as the LLM. The app is deployed on **Vercel**.

- Next.js provides frontend (chat UI) and backend (API routes) in a single process
- Vercel AI SDK provides `useChat()` on the client and `streamText()` on the server with built-in tool-calling support
- Streaming (SSE) for real-time token display during the demo
- Claude Sonnet 4.5 for both conversation and vision (bill extraction)

### Conversation Flow

The conversation flow is **driven entirely by the system prompt**, not by application-level state management. The system prompt describes five phases (Interest → Feasibility → Setup → ROI → Subsidies) and the model follows them naturally. Tool dependency chains enforce ordering — e.g., `calc_roi` can't run without consumption data.

This was chosen over a coded state machine because users may skip phases, loop back, or volunteer information out of order. The LLM handles this naturally; a state machine would fight it.

### Tools

Seven tools registered with the Vercel AI SDK:

| Tool | Purpose | Real/Mock |
|---|---|---|
| `extract_location` | Read EXIF GPS from uploaded photo → city/postcode | Real |
| `extract_balcony_info` | Return balcony dimensions, orientation, railing type | Mocked (3 hardcoded cases) |
| `extract_consumption` | Formalize yearly kWh the model reads from bill image | Real (vision) |
| `get_products` | Return 3 Balkonkraftwerk configurations | Mocked (hardcoded) |
| `calc_roi` | Compute payback, 25-year net, coverage | Real (ported from Python) |
| `get_subsidies` | Return applicable subsidies for a postcode | Mocked (Cologne €150) |
| `draft_landlord_letter` | Generate WEG/landlord notification letter | Real (template-based) |

### Domain Knowledge

Product configurations live in the `get_products` tool (not the system prompt) to keep context lean. The system prompt contains the conversation flow, persona/tone rules, legal facts (800W cap, Schuko under 960Wp, MaStR registration), and key domain knowledge. Tools are only called when there is actual computation, data retrieval, or document generation to do.

### ROI Calculator

The Python `roi_calculator.py` from the balkonkraftwerk-advisor skill is **ported to TypeScript**. The math includes regional yield factors, orientation multipliers, 25-year panel degradation (0.5%/yr), and electricity price inflation (2%/yr). The LLM never does arithmetic — all math goes through `calc_roi`.

### Mocked Balcony Cases

Three hardcoded cases for `extract_balcony_info`:

| Case | Dimensions | Orientation | Railing |
|---|---|---|---|
| A — ideal | 4m wide | South | Round bars |
| B — compact | 2.5m wide | South-West | Glass railing |
| C — challenging | 3m wide | East | Concrete parapet |

Demo uses Case A (south-facing, best ROI).

### Product Configurations (Hardcoded)

| Option | Modules | Inverter | Battery | Smart Meter | ~Price |
|---|---|---|---|---|---|
| Starter | 2× Solakon 450 Wp | Hoymiles HMS-800W-2T | — | — | ~400 € |
| + Battery | 2× Solakon 450 Wp | Hoymiles HMS-800W-2T | Solakon ONE 2.11 kWh | — | ~900 € |
| + Smart Meter | 2× Solakon 450 Wp | Hoymiles HMS-800W-2T | Solakon ONE 2.11 kWh | PowerTracker IR | ~950 € |

Solakon was chosen across the board: cheapest battery entry (649 €), PowerTracker IR avoids fusebox/WEG complications for apartment dwellers, and a single-brand story is cleaner for the demo.

### Landlord Letter

The `draft_landlord_letter` tool is **only triggered when the customer is renting AND the installation alters the building facade** (balcony railing mount, wall mount). Roof installs or indoor setups do not trigger it. Templates sourced from the balkonkraftwerk-advisor skill's `weg_landlord_letter.md`.

### Chat UI

Starting with a **generic chat UI template** (Vercel ai-chatbot or similar). Custom components (product comparison cards, ROI display) will be added after the designer prototypes them. Image upload via `useChat()` attachments — images sent as base64, Claude sees them natively.

### Language

English for all conversation. German only for the landlord letter (since it's a real legal document for German landlords).

### EV Charger Tail Pivot

No implementation needed. The model responds naturally to "I want an EV charger" by acknowledging the previous conversation. This is a cliffhanger moment in the demo, not a working feature.

### Project Structure

```
helios/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                ← chat UI
│   └── api/chat/route.ts      ← streamText + tool definitions
├── lib/
│   ├── tools/
│   │   ├── extract-location.ts
│   │   ├── extract-balcony-info.ts
│   │   ├── extract-consumption.ts
│   │   ├── get-products.ts
│   │   ├── calc-roi.ts
│   │   ├── get-subsidies.ts
│   │   └── draft-landlord-letter.ts
│   ├── roi.ts                  ← ported Python compute() logic
│   └── system-prompt.ts        ← conversation flow + domain knowledge
├── components/
│   └── chat.tsx
└── .claude/skills/             ← balkonkraftwerk-advisor + adr-writer
```

## Alternatives Considered

- **Coded state machine for conversation flow**: rejected because users skip and loop phases naturally; a state machine would fight this and cost half a day to build for no demo benefit.
- **Client-side LLM orchestration**: rejected because it leaks API keys and makes tool calling fragile.
- **Python backend (FastAPI)**: rejected in favor of Next.js to keep frontend + backend in one process with zero deployment friction on Vercel.
- **Separate vision call for bill extraction**: rejected because the Vercel AI SDK sends images as content blocks to Claude natively — no separate call needed.
- **Product configs in system prompt**: rejected to keep context lean; moved to `get_products` tool.

## Consequences

### Positive:
- **Single-process simplicity**: Next.js + Vercel AI SDK means one `npm run dev` for the full stack, one Vercel deployment.
- **Fast streaming demo**: SSE streaming via `useChat()` gives instant visual feedback during the presentation.
- **Extensible tool pattern**: Adding the EV wallbox or any other product category means adding tool responses, not changing architecture.
- **Honest math**: All ROI computation is deterministic TypeScript, never LLM-generated arithmetic.
- **Low mock surface**: Only 3 of 7 tools are mocked; the rest do real work.

### Negative:
- **System prompt fragility**: The conversation quality depends heavily on prompt engineering; a bad prompt edit could derail the demo flow.
- **No persistence**: Conversation state lives only in the Vercel AI SDK's in-memory message array; refreshing the page loses everything.
- **Hardcoded products**: The 3 Solakon configs are baked into code, not pulled from a real catalog.

## Implementation

- Chat UI scaffolded from a generic template, customized after designer input.
- ROI math ported from `scripts/roi_calculator.py` to `lib/roi.ts`.
- System prompt authored in `lib/system-prompt.ts`, heavily informed by the balkonkraftwerk-advisor skill's conversation flow.
- Landlord letter templates ported from `references/weg_landlord_letter.md`.
- EXIF extraction via `exif-parser` or equivalent npm package in `extract-location.ts`.
- Deployed to Vercel from a branch; preview URL used for demo.
