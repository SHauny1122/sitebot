import { NextResponse } from "next/server";
import { z } from "zod";
import { PAYSTACK_PLANS, isPaystackPlanId } from "@/lib/paystack";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

const payloadSchema = z.object({
  reference: z.string().trim().min(1)
});

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    metadata?: Record<string, unknown>;
    customer?: {
      email?: string;
    };
  };
};

export async function POST(request: Request) {
  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
  }

  // ENV REQUIRED: add PAYSTACK_SECRET_KEY in .env.local and Vercel project env settings.
  const secretKey = env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "PAYSTACK_SECRET_KEY is not configured." }, { status: 500 });
  }

  const verifyResponse = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(parsed.data.reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    }
  );

  const verifyData = (await verifyResponse.json()) as PaystackVerifyResponse;

  if (!verifyResponse.ok || !verifyData.status || !verifyData.data) {
    return NextResponse.json({ error: verifyData.message || "Unable to verify payment." }, { status: 502 });
  }

  const metadata = verifyData.data.metadata ?? {};
  const metadataPlan = typeof metadata.planId === "string" ? metadata.planId : "";
  const userId = typeof metadata.userId === "string" ? metadata.userId : "";

  if (!isPaystackPlanId(metadataPlan)) {
    return NextResponse.json({ error: "Payment metadata is invalid." }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Payment user metadata is missing." }, { status: 400 });
  }

  const expectedPlan = PAYSTACK_PLANS[metadataPlan];
  const normalizedCurrency = (verifyData.data.currency || "").toUpperCase();

  if (verifyData.data.status !== "success") {
    return NextResponse.json({ error: "Payment is not successful.", status: verifyData.data.status }, { status: 400 });
  }

  if (verifyData.data.amount !== expectedPlan.amountMinor || normalizedCurrency !== expectedPlan.currency) {
    return NextResponse.json({ error: "Payment amount or currency does not match selected plan." }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin.from("profiles").upsert(
    {
      user_id: userId,
      email: verifyData.data.customer?.email ?? null,
      plan: "pro"
    },
    { onConflict: "user_id" }
  );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    reference: verifyData.data.reference,
    plan: {
      id: expectedPlan.id,
      name: expectedPlan.name,
      amountDisplay: expectedPlan.amountDisplay,
      intervalLabel: expectedPlan.intervalLabel
    }
  });
}
