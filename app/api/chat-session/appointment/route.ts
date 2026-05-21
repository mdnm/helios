import { NextRequest, NextResponse } from "next/server";

const ENTITY_API = "https://entity.sls.epilot.io/v1/entity";

export async function POST(req: NextRequest) {
  const { ticketId, appointmentDate, slotWindow } = await req.json();

  if (!ticketId || !appointmentDate) {
    return NextResponse.json(
      { error: "Missing ticketId or appointmentDate" },
      { status: 400 },
    );
  }

  const token = process.env.EPILOT_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "EPILOT_API_TOKEN is not configured" },
      { status: 500 },
    );
  }

  const res = await fetch(`${ENTITY_API}/ticket/${ticketId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      installer_appointment: appointmentDate,
      installer_appointment_window: slotWindow ?? null,
      installer_appointment_status: "scheduled",
      installer_appointment_booked_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `[helios:api] appointment.patch.failed ${res.status} ${text}`,
    );
    return NextResponse.json(
      { error: `Failed to update ticket: ${res.status}` },
      { status: 500 },
    );
  }

  console.log(
    `[helios:api] appointment.synced ticket=${ticketId} date=${appointmentDate}`,
  );
  return NextResponse.json({ ok: true });
}
