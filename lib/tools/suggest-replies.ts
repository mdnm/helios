import { tool } from "ai";
import { z } from "zod";

/**
 * suggest_replies surfaces clickable quick-reply chips under the assistant
 * message in the UI. The model calls this tool whenever it asks the customer a
 * question that has a small set of common answers (e.g. "South / East / West /
 * North" for orientation, "Rent / Own" for housing). The user can still type
 * a free-form reply — the chips are an accelerator, not a constraint.
 *
 * The tool itself does no work: it just echoes the options back so they
 * appear as a tool-result part in the streamed message, which the frontend
 * renders as pill buttons.
 */
export const suggestReplies = tool({
  description:
    "Offer the customer 2–4 clickable quick-reply chips for the question you just asked. Use ONLY when the question has a small set of common, mutually exclusive answers a typical customer would pick (e.g. orientation, housing situation, rough kWh ranges, yes/no follow-ups). Do NOT use for open-ended questions like 'tell me about your balcony' or 'what's your address'. The user can still type a free-form reply, so don't add 'Other' as an option. Keep each label under ~25 characters.",
  inputSchema: z.object({
    options: z
      .array(z.string().min(1).max(40))
      .min(2)
      .max(4)
      .describe(
        "2–4 short, distinct, mutually-exclusive answer labels for the question you just asked.",
      ),
  }),
  execute: async ({ options }) => {
    // Pure passthrough — the chips are rendered client-side from this output.
    return { options };
  },
});
