import {
  streamText,
  UIMessage,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { systemPrompt } from "@/lib/system-prompt";
import { extractLocation } from "@/lib/tools/extract-location";
import { extractBalconyInfo } from "@/lib/tools/extract-balcony-info";
import { extractConsumption } from "@/lib/tools/extract-consumption";
import { getProducts } from "@/lib/tools/get-products";
import { calcRoi } from "@/lib/tools/calc-roi";
import { getSubsidies } from "@/lib/tools/get-subsidies";
import { draftLandlordLetter } from "@/lib/tools/draft-landlord-letter";

export const maxDuration = 60;

function logApi(event: string, data?: unknown): void {
  if (data === undefined) {
    console.log(`[helios:api] ${event}`);
  } else {
    console.log(`[helios:api] ${event}`, data);
  }
}

export async function POST(req: Request) {
  const t0 = Date.now();
  const { messages }: { messages: UIMessage[] } = await req.json();

  const last = messages[messages.length - 1];
  const partTypes = last?.parts?.map((p) => p.type) ?? [];
  logApi("chat.request", {
    messages: messages.length,
    lastRole: last?.role,
    lastParts: partTypes,
  });

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      extractLocation,
      extractBalconyInfo,
      extractConsumption,
      getProducts,
      calcRoi,
      getSubsidies,
      draftLandlordLetter,
    },
    onStepFinish: ({ toolCalls, toolResults, finishReason, usage }) => {
      logApi("chat.step", {
        toolCalls: toolCalls?.map((c) => c.toolName) ?? [],
        toolResults: toolResults?.length ?? 0,
        finishReason,
        usage,
      });
    },
    onError: ({ error }) => {
      logApi("chat.error", error);
    },
    onFinish: ({ finishReason, usage }) => {
      logApi("chat.finish", {
        ms: Date.now() - t0,
        finishReason,
        usage,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
