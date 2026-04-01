import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getApiUser } from "@/lib/api-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

const actionSchema = z.object({
  action: z.enum(["manage", "cancel"])
});

type ProfileSubscriptionRow = {
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

function isMissingColumnError(message: string) {
  return /column .* does not exist/i.test(message);
}

function formatPlanName(value: string | null | undefined) {
  if (value === "monthly") return "Starter Monthly";
  if (value === "yearly") return "Starter Yearly";
  if (value === "pro") return "Pro";
  return "Free";
}

async function getProfileSubscription(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("plan,paystack_plan_id,paystack_subscription_status,paystack_next_billing_date,paystack_subscription_code,paystack_email_token,paystack_customer_code")
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
  const plan = profile?.paystack_plan_id ?? profile?.plan ?? "free";
  const status = profile?.paystack_subscription_status ?? (plan === "free" ? "none" : "active");
  const nextBillingDate = profile?.paystack_next_billing_date ?? null;
  const subscriptionCode = profile?.paystack_subscription_code ?? null;
  const emailToken = profile?.paystack_email_token ?? null;
  const customerCode = profile?.paystack_customer_code ?? null;
  const canManageHosted = Boolean(subscriptionCode && emailToken);
  const directCancelSupported = Boolean(subscriptionCode && emailToken);

  return {
    plan,
    planName: formatPlanName(plan),
    status,
    nextBillingDate,
    customerCode,
    hasPaystackMetadata: canManageHosted,
    canManageHosted,
    directCancelSupported,
    missingMetadataReason: hasExtendedColumns
      ? canManageHosted
        ? null
        : "Missing Paystack subscription metadata (subscription code/email token)."
      : "Subscription metadata columns are not available yet in your database schema."
  };
}

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  }

  try {
    const { profile, hasExtendedColumns } = await getProfileSubscription(user.id);
    const summary = getSubscriptionSummary(profile, hasExtendedColumns);

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
  const summary = getSubscriptionSummary(profile, hasExtendedColumns);

  const subscriptionCode = profile?.paystack_subscription_code ?? null;
  const emailToken = profile?.paystack_email_token ?? null;

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
