import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getApiUser } from "@/lib/api-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

const actionSchema = z.object({
  action: z.enum(["manage", "cancel", "repair"])
});

type ProfileSubscriptionRow = {
  email?: string | null;
  plan?: string | null;
  paystack_plan_id?: string | null;
  paystack_subscription_status?: string | null;
  paystack_next_billing_date?: string | null;
  paystack_subscription_code?: string | null;
  paystack_email_token?: string | null;
  paystack_customer_code?: string | null;
};

type PaystackManageLinkResponse = {
  status: boolean;
  message: string;
  data?: {
    link?: string;
  };
};

type PaystackDisableResponse = {
  status: boolean;
  message: string;
};

type PaystackSubscriptionDetails = {
  subscription_code?: string;
  email_token?: string;
  next_payment_date?: string;
  status?: string;
};

type PaystackSubscriptionsResponse = {
  status: boolean;
  message: string;
  data?: PaystackSubscriptionDetails[];
};

type PaystackCustomerLookupResponse = {
  status: boolean;
  message: string;
  data?: {
    customer_code?: string;
    subscriptions?: PaystackSubscriptionDetails[];
  };
};

function isMissingColumnError(message: string) {
  return /column .* does not exist/i.test(message);
}

function formatPlanName(value: string | null | undefined) {
  if (value === "monthly") return "Starter Monthly";
  if (value === "yearly") return "Starter Yearly";
  if (value === "pro") return "Pro";
  return "Free";
}

function hasSubscriptionMetadata(value: PaystackSubscriptionDetails | null | undefined) {
  return Boolean(value?.subscription_code && value?.email_token);
}

function isPaidPlan(value: string | null | undefined) {
  return value === "monthly" || value === "yearly" || value === "pro";
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

  const customerData = (await customerResponse.json()) as PaystackCustomerLookupResponse;
  const customerSubscription = customerData.data?.subscriptions?.find(hasSubscriptionMetadata) ?? null;

  return {
    source: customerSubscription ? "customer" : "none",
    subscription: customerSubscription
  };
}

async function recoverSubscriptionMetadata(
  userId: string,
  profile: ProfileSubscriptionRow | null,
  hasExtendedColumns: boolean,
  secretKey: string,
  fallbackEmail: string | null
) {
  if (!hasExtendedColumns || !profile || !isPaidPlan(profile.paystack_plan_id ?? profile.plan)) {
    return profile;
  }

  if (profile.paystack_subscription_code && profile.paystack_email_token) {
    return profile;
  }

  let recoveredCustomerCode = profile.paystack_customer_code ?? null;
  let recoveredSubscription: PaystackSubscriptionDetails | null = null;
  const lookupEmail = profile.email ?? fallbackEmail;

  if (lookupEmail) {
    const previousCustomerCode = recoveredCustomerCode;
    const customerByEmailResponse = await fetch(`https://api.paystack.co/customer/${encodeURIComponent(lookupEmail)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });

    if (customerByEmailResponse.ok) {
      const customerByEmailData = (await customerByEmailResponse.json()) as PaystackCustomerLookupResponse;
      recoveredCustomerCode = customerByEmailData.data?.customer_code ?? recoveredCustomerCode;
      recoveredSubscription = customerByEmailData.data?.subscriptions?.find(hasSubscriptionMetadata) ?? null;
      console.info("[paystack/subscription] Metadata recovery email lookup", {
        userId,
        lookupEmail,
        previousCustomerCodePresent: Boolean(previousCustomerCode),
        customerCodePresent: Boolean(customerByEmailData.data?.customer_code),
        customerCodeChanged: Boolean(customerByEmailData.data?.customer_code && customerByEmailData.data.customer_code !== previousCustomerCode),
        subscriptionCodePresent: Boolean(recoveredSubscription?.subscription_code),
        emailTokenPresent: Boolean(recoveredSubscription?.email_token)
      });
    } else {
      console.warn("[paystack/subscription] Metadata recovery email lookup failed", {
        userId,
        lookupEmail,
        status: customerByEmailResponse.status
      });
    }
  }

  if (!hasSubscriptionMetadata(recoveredSubscription) && recoveredCustomerCode) {
    const fallbackResult = await fetchSubscriptionByCustomerCode(secretKey, recoveredCustomerCode);
    if (fallbackResult.subscription) {
      recoveredSubscription = fallbackResult.subscription;
    }

    console.info("[paystack/subscription] Metadata recovery lookup", {
      userId,
      source: fallbackResult.source,
      lookupEmail,
      customerCodePresent: Boolean(recoveredCustomerCode),
      subscriptionCodePresent: Boolean(fallbackResult.subscription?.subscription_code),
      emailTokenPresent: Boolean(fallbackResult.subscription?.email_token),
      nextPaymentDatePresent: Boolean(fallbackResult.subscription?.next_payment_date)
    });
  }

  const patch: Record<string, string | null> = {};

  if (recoveredCustomerCode && recoveredCustomerCode !== profile.paystack_customer_code) {
    patch.paystack_customer_code = recoveredCustomerCode;
  }

  if (recoveredSubscription?.subscription_code && recoveredSubscription.subscription_code !== profile.paystack_subscription_code) {
    patch.paystack_subscription_code = recoveredSubscription.subscription_code;
  }

  if (recoveredSubscription?.email_token && recoveredSubscription.email_token !== profile.paystack_email_token) {
    patch.paystack_email_token = recoveredSubscription.email_token;
  }

  if (recoveredSubscription?.next_payment_date) {
    patch.paystack_next_billing_date = recoveredSubscription.next_payment_date;
  }

  if (recoveredSubscription?.status) {
    patch.paystack_subscription_status = recoveredSubscription.status;
  } else if (!profile.paystack_subscription_code && !profile.paystack_email_token) {
    const normalizedStatus = (profile.paystack_subscription_status ?? "").trim().toLowerCase();
    if (normalizedStatus && normalizedStatus !== "none" && normalizedStatus !== "cancelled") {
      patch.paystack_subscription_status = "none";
    }

    if (profile.paystack_next_billing_date) {
      patch.paystack_next_billing_date = null;
    }
  }

  if (Object.keys(patch).length === 0) {
    return profile;
  }

  const { error } = await supabaseAdmin.from("profiles").update(patch).eq("user_id", userId);
  if (error) {
    console.warn("[paystack/subscription] Metadata recovery update failed", {
      userId,
      error: error.message
    });
    return profile;
  }

  console.info("[paystack/subscription] Metadata recovered", {
    userId,
    updatedKeys: Object.keys(patch)
  });

  return {
    ...profile,
    ...patch
  };
}

async function getProfileSubscription(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("email,plan,paystack_plan_id,paystack_subscription_status,paystack_next_billing_date,paystack_subscription_code,paystack_email_token,paystack_customer_code")
    .eq("user_id", userId)
    .maybeSingle<ProfileSubscriptionRow>();

  if (!error) {
    return {
      profile: data ?? null,
      hasExtendedColumns: true
    };
  }

  if (!isMissingColumnError(error.message)) {
    throw error;
  }

  const fallback = await supabaseAdmin.from("profiles").select("plan").eq("user_id", userId).maybeSingle<{ plan?: string | null }>();
  if (fallback.error) {
    throw fallback.error;
  }

  return {
    profile: fallback.data
      ? {
          plan: fallback.data.plan
        }
      : null,
    hasExtendedColumns: false
  };
}

function getSubscriptionSummary(profile: ProfileSubscriptionRow | null, hasExtendedColumns: boolean) {
  const rawPlan = profile?.paystack_plan_id ?? profile?.plan ?? "free";
  const subscriptionCode = profile?.paystack_subscription_code ?? null;
  const emailToken = profile?.paystack_email_token ?? null;
  const hasRealSubscription = Boolean(subscriptionCode && emailToken);
  const plan = hasRealSubscription ? rawPlan : "free";
  const status = hasRealSubscription ? profile?.paystack_subscription_status ?? "active" : "none";
  const nextBillingDate = profile?.paystack_next_billing_date ?? null;
  const customerCode = profile?.paystack_customer_code ?? null;
  const canManageHosted = hasRealSubscription;
  const directCancelSupported = hasRealSubscription;
  const showMissingMetadataWarning = hasExtendedColumns && Boolean(rawPlan !== "free" && status !== "none" && !hasRealSubscription);

  return {
    plan,
    planName: formatPlanName(plan),
    status,
    nextBillingDate,
    customerCode,
    hasPaystackMetadata: canManageHosted,
    canManageHosted,
    directCancelSupported,
    missingMetadataReason: !hasExtendedColumns
      ? "Subscription metadata columns are not available yet in your database schema."
      : showMissingMetadataWarning
        ? "Missing Paystack subscription metadata (subscription code/email token)."
        : null
  };
}

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  }

  try {
    const { profile, hasExtendedColumns } = await getProfileSubscription(user.id);
    const secretKey = env.PAYSTACK_SECRET_KEY;
    const recoveredProfile = secretKey ? await recoverSubscriptionMetadata(user.id, profile, hasExtendedColumns, secretKey, user.email ?? null) : profile;
    const summary = getSubscriptionSummary(recoveredProfile, hasExtendedColumns);

    console.info("[paystack/subscription] GET summary", {
      userId: user.id,
      plan: summary.plan,
      status: summary.status,
      hasPaystackMetadata: summary.hasPaystackMetadata,
      customerCodePresent: Boolean(summary.customerCode),
      missingMetadataReason: summary.missingMetadataReason
    });

    return NextResponse.json({
      subscription: summary
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load subscription details."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  }

  const secretKey = env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "PAYSTACK_SECRET_KEY is not configured." }, { status: 500 });
  }

  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription action." }, { status: 400 });
  }

  const { profile, hasExtendedColumns } = await getProfileSubscription(user.id);
  const recoveredProfile = await recoverSubscriptionMetadata(user.id, profile, hasExtendedColumns, secretKey, user.email ?? null);
  const summary = getSubscriptionSummary(recoveredProfile, hasExtendedColumns);

  console.info("[paystack/subscription] POST request", {
    userId: user.id,
    action: parsed.data.action,
    plan: summary.plan,
    status: summary.status,
    hasPaystackMetadata: summary.hasPaystackMetadata,
    customerCodePresent: Boolean(summary.customerCode),
    missingMetadataReason: summary.missingMetadataReason
  });

  if (parsed.data.action === "repair") {
    return NextResponse.json({
      success: true,
      action: "repair",
      subscription: summary
    });
  }

  const subscriptionCode = recoveredProfile?.paystack_subscription_code ?? null;
  const emailToken = recoveredProfile?.paystack_email_token ?? null;

  if (!subscriptionCode || !emailToken) {
    return NextResponse.json(
      {
        error: "Missing Paystack subscription metadata.",
        details: summary.missingMetadataReason
      },
      { status: 400 }
    );
  }

  if (parsed.data.action === "manage") {
    const manageResponse = await fetch("https://api.paystack.co/subscription/manage/link", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: subscriptionCode,
        token: emailToken
      })
    });

    const manageData = (await manageResponse.json()) as PaystackManageLinkResponse;

    if (!manageResponse.ok || !manageData.status || !manageData.data?.link) {
      return NextResponse.json(
        {
          error: manageData.message || "Unable to generate subscription management link.",
          details: {
            paystackHttpStatus: manageResponse.status,
            paystackMessage: manageData.message
          }
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      action: "manage",
      manageUrl: manageData.data.link
    });
  }

  const disableResponse = await fetch("https://api.paystack.co/subscription/disable", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      code: subscriptionCode,
      token: emailToken
    })
  });

  const disableData = (await disableResponse.json()) as PaystackDisableResponse;

  if (!disableResponse.ok || !disableData.status) {
    return NextResponse.json(
      {
        error: disableData.message || "Unable to cancel subscription.",
        details: {
          paystackHttpStatus: disableResponse.status,
          paystackMessage: disableData.message
        }
      },
      { status: 502 }
    );
  }

  if (hasExtendedColumns) {
    await supabaseAdmin
      .from("profiles")
      .update({
        paystack_subscription_status: "cancelled",
        paystack_next_billing_date: null
      })
      .eq("user_id", user.id);
  }

  return NextResponse.json({
    success: true,
    action: "cancel",
    message: "Subscription cancelled successfully."
  });
}
