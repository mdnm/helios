import { NextRequest, NextResponse } from "next/server";

const ENTITY_API = "https://entity.sls.epilot.io/v1/entity";
const TOKEN = () => process.env.EPILOT_API_TOKEN!;

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN()}`,
  };
}

export async function POST() {
  const res = await fetch(`${ENTITY_API}/ticket`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      ticket_title: `Helios Chat — ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`,
      status: "Open",
      source: {
        title: "Helios AI Assistant",
        href: process.env.NEXT_PUBLIC_APP_URL ?? "https://helios-green.vercel.app",
      },
      chat_messages: [],
      chat_source: "helios",
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  const data = await res.json();
  const ticketId = data.entity?._id ?? data._id;

  return NextResponse.json({ ticketId });
}

export async function GET(req: NextRequest) {
  const ticketId = req.nextUrl.searchParams.get("ticketId");
  if (!ticketId) {
    return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });
  }

  const res = await fetch(`${ENTITY_API}/ticket/${ticketId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const data = await res.json();
  const entity = data.entity ?? data;

  const msgs = (entity.chat_messages ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    parts: Array.isArray(m.parts) ? m.parts : [{ type: "text", text: m.content ?? "" }],
  }));

  return NextResponse.json({
    ticketId: entity._id,
    messages: msgs,
  });
}

export async function PATCH(req: NextRequest) {
  const { ticketId, messages } = await req.json();

  if (!ticketId || !messages) {
    return NextResponse.json({ error: "Missing ticketId or messages" }, { status: 400 });
  }

  const serializedMessages = messages.map((m: Record<string, unknown>) => {
    const parts = Array.isArray(m.parts)
      ? (m.parts as Array<Record<string, unknown>>).map((p) => {
          if (p.type === "file" && typeof p.url === "string" && p.url.startsWith("data:")) {
            return { type: "text", text: "[image]" };
          }
          return p;
        })
      : [{ type: "text", text: typeof m.content === "string" ? m.content : JSON.stringify(m) }];

    const textContent = parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    return {
      role: m.role,
      content: textContent,
      parts,
      timestamp: m.createdAt ?? new Date().toISOString(),
    };
  });

  const res = await fetch(`${ENTITY_API}/ticket/${ticketId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ chat_messages: serializedMessages }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
