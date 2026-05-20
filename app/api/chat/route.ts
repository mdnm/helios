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

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-5-20250514"),
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
  });

  return result.toUIMessageStreamResponse();
}
