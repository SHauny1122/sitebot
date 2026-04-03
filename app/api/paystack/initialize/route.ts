import crypto from "crypto";
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
    console.info("[paystack/initialize] Unauthorized initialize attempt");
    return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    console.info("[paystack/initialize] Invalid payload", {
      userId: user.id
    });
    return NextResponse.json({ error: "Invalid plan selection." }, { status: 400 });
  }

  const planId = parsed.data.plan;
  if (!isPaystackPlanId(planId)) {
    console.info("[paystack/initialize] Unsupported plan", {
      userId: user.id,
      plan: planId
    });
    return NextResponse.json({ error: "Unsupported plan." }, { status: 400 });
  }

  // ENV REQUIRED: add PAYSTACK_SECRET_KEY in .env.local and Vercel project env settings.
  const secretKey = env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.info("[paystack/initialize] Missing PAYSTACK_SECRET_KEY", {
      userId: user.id,
      plan: planId
    });
    return NextResponse.json({ error: "PAYSTACK_SECRET_KEY is not configured." }, { status: 500 });
  }

  const plan = PAYSTACK_PLANS[planId];
  const planCode = planId === "monthly" ? env.PAYSTACK_PLAN_MONTHLY : env.PAYSTACK_PLAN_YEARLY;
  if (!planCode) {
    console.error("[paystack/initialize] Missing Paystack plan code", {
      userId: user.id,
      plan: plan.id
    });
    return NextResponse.json({ error: "PAYSTACK plan codes are not configured." }, { status: 500 });
  }

  const reference = `sitechat_${plan.id}_${crypto.randomUUID()}`;

  console.info("[paystack/initialize] Initializing transaction", {
    userId: user.id,
    email: user.email,
    plan: plan.id,
    planCode
  });

  const callbackUrl = `${env.NEXT_PUBLIC_SITE_URL}/payment/callback?plan=${encodeURIComponent(plan.id)}`;

  const initializePayload = {
    email: user.email,
    plan: planCode,
    reference,
    callback_url: callbackUrl,
    metadata: {
      planId: plan.id,
      userId: user.id,
      planName: plan.name,
      interval: plan.intervalLabel,
      planCode
    }
  };

  console.info("[paystack/initialize] Request payload", {
    email: initializePayload.email,
    planCode,
    callback_url: initializePayload.callback_url,
    reference: initializePayload.reference
  });

  const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(initializePayload)
  });

  const paystackData = (await paystackResponse.json()) as PaystackInitializeResponse;

  if (!paystackResponse.ok || !paystackData.status || !paystackData.data?.authorization_url) {
    console.info("[paystack/initialize] Paystack initialize failed", {
      userId: user.id,
      plan: plan.id,
      status: paystackResponse.status,
      message: paystackData.message,
      planCode
    });

    const responseStatus = paystackResponse.status >= 400 ? paystackResponse.status : 502;

    return NextResponse.json(
      {
        error: paystackData.message || "Failed to initialize payment.",
        details: {
          paystackHttpStatus: paystackResponse.status,
          paystackStatus: paystackData.status,
          paystackMessage: paystackData.message,
          plan: plan.id,
          planCode,
          callbackUrl,
          reference
        }
      },
      { status: responseStatus }
    );
  }

  console.info("[paystack/initialize] Paystack initialize succeeded", {
    userId: user.id,
    plan: plan.id,
    reference: paystackData.data.reference
  });

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
