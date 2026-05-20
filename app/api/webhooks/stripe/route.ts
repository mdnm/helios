import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const submissionId = session.metadata?.epilot_submission_id;

    if (submissionId) {
      try {
        await updateEpilotOrderStatus(submissionId);
      } catch (err) {
        console.error("Failed to update epilot order status:", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}

async function updateEpilotOrderStatus(submissionId: string) {
  const token = process.env.EPILOT_API_TOKEN;
  if (!token) return;

  const searchRes = await fetch(
    "https://entity.sls.epilot.io/v1/entity:search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        q: `_schema:order AND _tags:"submission_${submissionId}"`,
        size: 1,
      }),
    },
  );

  if (!searchRes.ok) return;

  const searchData = await searchRes.json();
  const order = searchData?.results?.[0];
  if (!order?._id) return;

  await fetch(
    `https://entity.sls.epilot.io/v1/entity/order/${order._id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: "paid",
        payment_status: "paid",
      }),
    },
  );
}
