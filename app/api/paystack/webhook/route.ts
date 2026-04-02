import crypto from "crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isPaystackPlanId } from "@/lib/paystack";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PaystackSubscriptionLike = {
  subscription_code?: string;
  email_token?: string;
  next_payment_date?: string;
  status?: string;
};

type PaystackSubscriptionsResponse = {
  status: boolean;
  message: string;
  data?: PaystackSubscriptionLike[];
};

type PaystackCustomerResponse = {
  status: boolean;
  message: string;
  data?: {
    subscriptions?: PaystackSubscriptionLike[];
  };
};

type PaystackWebhookPayload = {
  event?: string;
  data?: {
    status?: string;
    metadata?: Record<string, unknown>;
    customer?: {
      email?: string;
      customer_code?: string;
    };
    subscription?: PaystackSubscriptionLike;
    subscriptions?: PaystackSubscriptionLike[];
    subscription_code?: string;
    email_token?: string;
    next_payment_date?: string;
  };
};

function safeLower(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function verifySignature(rawBody: string, signatureHeader: string, secretKey: string) {
  const computed = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const expected = Buffer.from(computed, "utf8");
  const received = Buffer.from(signatureHeader, "utf8");

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

function extractSubscription(data: PaystackWebhookPayload["data"]): PaystackSubscriptionLike | null {
  if (!data) return null;
  if (data.subscription) return data.subscription;
  if (Array.isArray(data.subscriptions) && data.subscriptions[0]) return data.subscriptions[0];

  if (data.subscription_code || data.email_token || data.next_payment_date) {
    return {
      subscription_code: data.subscription_code,
      email_token: data.email_token,
      next_payment_date: data.next_payment_date,
      status: data.status
    };
  }

  return null;
}

function hasSubscriptionMetadata(value: PaystackSubscriptionLike | null) {
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

function getPlanIdFromMetadata(metadata: Record<string, unknown> | undefined) {
  const planId = typeof metadata?.planId === "string" ? metadata.planId : "";
  return isPaystackPlanId(planId) ? planId : null;
}

async function resolveUserId(customerCode: string | null, customerEmail: string | null, metadataUserId: string | null) {
  if (metadataUserId) {
    return metadataUserId;
  }

  if (customerCode) {
    const byCustomer = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("paystack_customer_code", customerCode)
      .maybeSingle<{ user_id: string }>();

    if (byCustomer.data?.user_id) return byCustomer.data.user_id;
  }

  if (customerEmail) {
    const byEmail = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", customerEmail)
      .maybeSingle<{ user_id: string }>();

    if (byEmail.data?.user_id) return byEmail.data.user_id;
  }

  return null;
}

export async function POST(request: Request) {
  const secretKey = env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "PAYSTACK_SECRET_KEY is not configured." }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  if (!signature || !verifySignature(rawBody, signature, secretKey)) {
    console.warn("[paystack/webhook] Invalid signature", {
      hasSignature: Boolean(signature)
    });
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const event = payload.event ?? "unknown";
  const data = payload.data;
  const metadata = data?.metadata;
  const metadataUserId = typeof metadata?.userId === "string" ? metadata.userId : null;
  const customerCode = data?.customer?.customer_code ?? null;
  const customerEmail = safeLower(data?.customer?.email ?? null) || null;
  let subscription = extractSubscription(data);

  if (!hasSubscriptionMetadata(subscription) && customerCode) {
    const fallbackResult = await fetchSubscriptionByCustomerCode(secretKey, customerCode);

    if (fallbackResult.subscription) {
      subscription = fallbackResult.subscription;
    }

    console.info("[paystack/webhook] Subscription metadata fallback result", {
      event,
      source: fallbackResult.source,
      customerCodePresent: true,
      subscriptionCodePresent: Boolean(fallbackResult.subscription?.subscription_code),
      emailTokenPresent: Boolean(fallbackResult.subscription?.email_token),
      nextPaymentDatePresent: Boolean(fallbackResult.subscription?.next_payment_date),
      subscriptionStatus: fallbackResult.subscription?.status ?? null
    });
  }

  console.info("[paystack/webhook] Event received", {
    event,
    metadataUserIdPresent: Boolean(metadataUserId),
    customerCodePresent: Boolean(customerCode),
    customerEmailPresent: Boolean(customerEmail),
    subscriptionCodePresent: Boolean(subscription?.subscription_code)
  });

  const supportedEvents = new Set([
    "charge.success",
    "subscription.create",
    "subscription.disable",
    "subscription.not_renew",
    "invoice.create",
    "invoice.update",
    "invoice.failed"
  ]);

  if (!supportedEvents.has(event)) {
    return NextResponse.json({ received: true, ignored: true, event });
  }

  const userId = await resolveUserId(customerCode, customerEmail, metadataUserId);
  if (!userId) {
    console.warn("[paystack/webhook] No matching profile for event", {
      event,
      metadataUserId,
      customerCode,
      customerEmail
    });
    return NextResponse.json({ received: true, event, matchedProfile: false });
  }

  const profilePatch: Record<string, string | null> = {};

  if (customerEmail) profilePatch.email = customerEmail;
  if (customerCode) profilePatch.paystack_customer_code = customerCode;

  const planId = getPlanIdFromMetadata(metadata);
  if (planId) profilePatch.paystack_plan_id = planId;

  if (event === "charge.success") {
    profilePatch.plan = "pro";
    profilePatch.paystack_subscription_status = subscription?.status ?? "active";
  }

  if (event === "subscription.create") {
    profilePatch.paystack_subscription_status = subscription?.status ?? "active";
  }

  if (event === "subscription.disable") {
    profilePatch.paystack_subscription_status = "cancelled";
    profilePatch.paystack_next_billing_date = null;
  }

  if (event === "subscription.not_renew") {
    profilePatch.paystack_subscription_status = "not_renew";
  }

  if (event === "invoice.create" || event === "invoice.update") {
    if (subscription?.status) {
      profilePatch.paystack_subscription_status = subscription.status;
    }
  }

  if (event === "invoice.failed") {
    profilePatch.paystack_subscription_status = "payment_failed";
  }

  if (subscription?.subscription_code) {
    profilePatch.paystack_subscription_code = subscription.subscription_code;
  }
  if (subscription?.email_token) {
    profilePatch.paystack_email_token = subscription.email_token;
  }
  if (subscription?.next_payment_date) {
    profilePatch.paystack_next_billing_date = subscription.next_payment_date;
  }

  if (Object.keys(profilePatch).length === 0) {
    return NextResponse.json({ received: true, event, matchedProfile: true, updated: false });
  }

  const { error } = await supabaseAdmin.from("profiles").update(profilePatch).eq("user_id", userId);

  if (error) {
    console.error("[paystack/webhook] Profile update failed", {
      event,
      userId,
      error: error.message
    });
    return NextResponse.json({ error: "Webhook update failed." }, { status: 500 });
  }

  console.info("[paystack/webhook] Profile updated", {
    event,
    userId,
    updatedKeys: Object.keys(profilePatch)
  });

  return NextResponse.json({ received: true, event, matchedProfile: true, updated: true });
}
