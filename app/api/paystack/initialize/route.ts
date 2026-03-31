import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api-user";
import { env } from "@/lib/env";
import { PAYSTACK_PLANS, isPaystackPlanId } from "@/lib/paystack";

const payloadSchema = z.object({
  plan: z.enum(["monthly", "yearly"])
});

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan selection." }, { status: 400 });
  }

  const planId = parsed.data.plan;
  if (!isPaystackPlanId(planId)) {
    return NextResponse.json({ error: "Unsupported plan." }, { status: 400 });
  }

  // ENV REQUIRED: add PAYSTACK_SECRET_KEY in .env.local and Vercel project env settings.
  const secretKey = env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "PAYSTACK_SECRET_KEY is not configured." }, { status: 500 });
  }

  const plan = PAYSTACK_PLANS[planId];
  const reference = `sitechat_${plan.id}_${crypto.randomUUID()}`;

  const callbackUrl = `${env.NEXT_PUBLIC_SITE_URL}/payment/callback?plan=${encodeURIComponent(plan.id)}`;

  const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: user.email,
      amount: plan.amountMinor,
      currency: plan.currency,
      reference,
      callback_url: callbackUrl,
      metadata: {
        planId: plan.id,
        userId: user.id,
        planName: plan.name,
        interval: plan.intervalLabel,
        amountMinor: plan.amountMinor,
        currency: plan.currency
      }
    })
  });

  const paystackData = (await paystackResponse.json()) as PaystackInitializeResponse;

  if (!paystackResponse.ok || !paystackData.status || !paystackData.data?.authorization_url) {
    return NextResponse.json(
      { error: paystackData.message || "Failed to initialize payment." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    authorizationUrl: paystackData.data.authorization_url,
    reference: paystackData.data.reference,
    plan: {
      id: plan.id,
      name: plan.name,
      amountDisplay: plan.amountDisplay,
      intervalLabel: plan.intervalLabel
    }
  });
}
