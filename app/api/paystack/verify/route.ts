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
    subscription?: {
      subscription_code?: string;
      email_token?: string;
      next_payment_date?: string;
      status?: string;
      plan_code?: string;
      plan?: {
        plan_code?: string;
      };
    };
    subscriptions?: {
      subscription_code?: string;
      email_token?: string;
      next_payment_date?: string;
      status?: string;
      plan_code?: string;
      plan?: {
        plan_code?: string;
      };
    }[];
    customer?: {
      email?: string;
      customer_code?: string;
    };
  };
};

type ExistingProfilePaystackFields = {
  email?: string | null;
  plan?: string | null;
  paystack_plan_id?: string | null;
  paystack_plan_code?: string | null;
  paystack_customer_code?: string | null;
  paystack_subscription_status?: string | null;
  paystack_subscription_code?: string | null;
  paystack_email_token?: string | null;
  paystack_next_billing_date?: string | null;
};

type PaystackSubscriptionDetails = {
  subscription_code?: string;
  email_token?: string;
  next_payment_date?: string;
  status?: string;
  plan_code?: string;
  plan?: {
    plan_code?: string;
  };
};

type PaystackSubscriptionsResponse = {
  status: boolean;
  message: string;
  data?: PaystackSubscriptionDetails[];
};

type PaystackCustomerResponse = {
  status: boolean;
  message: string;
  data?: {
    subscriptions?: PaystackSubscriptionDetails[];
  };
};

function isMissingColumnError(message: string) {
  return /column .* does not exist/i.test(message);
}

function hasSubscriptionMetadata(value: PaystackSubscriptionDetails | null) {
  return Boolean(value?.subscription_code && value?.email_token);
}

async function fetchSubscriptionByCustomerCode(secretKey: string, customerCode: string) {
  const subscriptionsResponse = await fetch(
    `https://api.paystack.co/subscription?customer=${encodeURIComponent(customerCode)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    }
  );

  if (subscriptionsResponse.ok) {
    const subscriptionsData = (await subscriptionsResponse.json()) as PaystackSubscriptionsResponse;
    const match = subscriptionsData.data?.find(hasSubscriptionMetadata) ?? null;
    if (match) {
      return {
        source: "subscription-list",
        subscription: match
      };
    }
  }

  const customerResponse = await fetch(`https://api.paystack.co/customer/${encodeURIComponent(customerCode)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });

  if (!customerResponse.ok) {
    return {
      source: "none",
      subscription: null
    };
  }

  const customerData = (await customerResponse.json()) as PaystackCustomerResponse;
  const customerSubscription = customerData.data?.subscriptions?.find(hasSubscriptionMetadata) ?? null;

  return {
    source: customerSubscription ? "customer" : "none",
    subscription: customerSubscription
  };
}

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
  const metadataPlanCode = typeof metadata.planCode === "string" ? metadata.planCode : null;
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

  const subscriptionInVerify = verifyData.data.subscription ?? verifyData.data.subscriptions?.[0] ?? null;

  console.info("[paystack/verify] Verify payload shape", {
    reference: verifyData.data.reference,
    status: verifyData.data.status,
    dataKeys: Object.keys(verifyData.data),
    hasSubscriptionObject: Boolean(verifyData.data.subscription),
    subscriptionKeys: verifyData.data.subscription ? Object.keys(verifyData.data.subscription) : [],
    subscriptionsCount: Array.isArray(verifyData.data.subscriptions) ? verifyData.data.subscriptions.length : 0,
    firstSubscriptionsKeys: verifyData.data.subscriptions?.[0] ? Object.keys(verifyData.data.subscriptions[0]) : [],
    hasCustomerObject: Boolean(verifyData.data.customer),
    customerCodePresent: Boolean(verifyData.data.customer?.customer_code),
    metadataKeys: Object.keys(metadata),
    subscriptionCodePresent: Boolean(subscriptionInVerify?.subscription_code),
    emailTokenPresent: Boolean(subscriptionInVerify?.email_token),
    nextPaymentDatePresent: Boolean(subscriptionInVerify?.next_payment_date),
    subscriptionStatusFromVerify: subscriptionInVerify?.status ?? null
  });

  let subscriptionFromResponse = subscriptionInVerify;

  if (!hasSubscriptionMetadata(subscriptionFromResponse) && verifyData.data.customer?.customer_code) {
    const fallbackResult = await fetchSubscriptionByCustomerCode(secretKey, verifyData.data.customer.customer_code);

    if (fallbackResult.subscription) {
      subscriptionFromResponse = fallbackResult.subscription;
    }

    console.info("[paystack/verify] Subscription metadata fallback result", {
      reference: verifyData.data.reference,
      source: fallbackResult.source,
      customerCodePresent: true,
      subscriptionCodePresent: Boolean(fallbackResult.subscription?.subscription_code),
      emailTokenPresent: Boolean(fallbackResult.subscription?.email_token),
      nextPaymentDatePresent: Boolean(fallbackResult.subscription?.next_payment_date),
      subscriptionStatus: fallbackResult.subscription?.status ?? null
    });
  }

  let existingProfile: ExistingProfilePaystackFields | null = null;
  const existingProfileResult = await supabaseAdmin
    .from("profiles")
    .select(
      "email,plan,paystack_plan_id,paystack_plan_code,paystack_customer_code,paystack_subscription_status,paystack_subscription_code,paystack_email_token,paystack_next_billing_date"
    )
    .eq("user_id", userId)
    .maybeSingle<ExistingProfilePaystackFields>();

  if (existingProfileResult.error && !isMissingColumnError(existingProfileResult.error.message)) {
    return NextResponse.json({ error: existingProfileResult.error.message }, { status: 500 });
  }

  if (!existingProfileResult.error) {
    existingProfile = existingProfileResult.data ?? null;
  }

  const hasRealSubscription = hasSubscriptionMetadata(subscriptionFromResponse);
  const derivedPlanCode =
    subscriptionFromResponse?.plan_code ??
    subscriptionFromResponse?.plan?.plan_code ??
    metadataPlanCode ??
    existingProfile?.paystack_plan_code ??
    null;

  if (!hasRealSubscription) {
    console.warn("[paystack/verify] No Paystack subscription metadata returned", {
      reference: verifyData.data.reference,
      metadataPlan,
      metadataPlanCode,
      customerCodePresent: Boolean(verifyData.data.customer?.customer_code)
    });
  }

  const profileUpdatePayload = {
    user_id: userId,
    email: verifyData.data.customer?.email ?? existingProfile?.email ?? null,
    plan: hasRealSubscription ? "pro" : "free",
    paystack_plan_id: hasRealSubscription ? expectedPlan.id : null,
    paystack_plan_code: hasRealSubscription ? derivedPlanCode : null,
    paystack_customer_code: verifyData.data.customer?.customer_code ?? existingProfile?.paystack_customer_code ?? null,
    paystack_subscription_status: hasRealSubscription
      ? subscriptionFromResponse?.status ?? existingProfile?.paystack_subscription_status ?? "active"
      : "none",
    paystack_subscription_code: hasRealSubscription ? subscriptionFromResponse?.subscription_code ?? null : null,
    paystack_email_token: hasRealSubscription ? subscriptionFromResponse?.email_token ?? null : null,
    paystack_next_billing_date: hasRealSubscription ? subscriptionFromResponse?.next_payment_date ?? null : null
  };

  console.info("[paystack/verify] Profile subscription values before save", {
    reference: verifyData.data.reference,
    paystackPlanId: profileUpdatePayload.paystack_plan_id,
    paystackPlanCode: profileUpdatePayload.paystack_plan_code,
    customerCodePresent: Boolean(profileUpdatePayload.paystack_customer_code),
    subscriptionStatus: profileUpdatePayload.paystack_subscription_status,
    subscriptionCodePresent: Boolean(profileUpdatePayload.paystack_subscription_code),
    emailTokenPresent: Boolean(profileUpdatePayload.paystack_email_token),
    nextBillingDatePresent: Boolean(profileUpdatePayload.paystack_next_billing_date)
  });

  const { error: initialUpdateError } = await supabaseAdmin.from("profiles").upsert(profileUpdatePayload, { onConflict: "user_id" });

  let updateError = initialUpdateError;

  if (initialUpdateError && isMissingColumnError(initialUpdateError.message)) {
    const { error: fallbackError } = await supabaseAdmin.from("profiles").upsert(
      {
        user_id: userId,
        email: verifyData.data.customer?.email ?? null,
        plan: "pro"
      },
      { onConflict: "user_id" }
    );
    updateError = fallbackError;
  }

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
