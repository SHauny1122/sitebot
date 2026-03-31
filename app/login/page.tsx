import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { isPaystackPlanId } from "@/lib/paystack";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleQueryValue(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return undefined;
}

function getSafeRedirectPath(value: string | undefined) {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/#pricing";
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const code = getSingleQueryValue(params?.code);
  const tokenHash = getSingleQueryValue(params?.token_hash);
  const otpType = getSingleQueryValue(params?.type);
  const authError = getSingleQueryValue(params?.error);
  const authErrorCode = getSingleQueryValue(params?.error_code);
  const authErrorDescription = getSingleQueryValue(params?.error_description);

  if (code || tokenHash || authError || authErrorCode) {
    const callbackParams = new URLSearchParams();

    if (code) {
      callbackParams.set("code", code);
    }
    if (tokenHash) {
      callbackParams.set("token_hash", tokenHash);
    }
    if (otpType) {
      callbackParams.set("type", otpType);
    }
    if (authError) {
      callbackParams.set("error", authError);
    }
    if (authErrorCode) {
      callbackParams.set("error_code", authErrorCode);
    }
    if (authErrorDescription) {
      callbackParams.set("error_description", authErrorDescription);
    }

    const intent = getSingleQueryValue(params?.intent);
    const next = getSingleQueryValue(params?.next);
    const plan = getSingleQueryValue(params?.plan);

    if (intent) {
      callbackParams.set("intent", intent);
    }
    if (next?.startsWith("/") && !next.startsWith("//")) {
      callbackParams.set("next", next);
    }
    if (plan === "monthly" || plan === "yearly") {
      callbackParams.set("plan", plan);
    }

    redirect(`/auth/complete?${callbackParams.toString()}` as Parameters<typeof redirect>[0]);
  }

  const user = await getCurrentUser();
  if (user) {
    const intent = getSingleQueryValue(params?.intent);
    const requestedPlan = getSingleQueryValue(params?.plan);
    const nextPath = intent === "checkout" ? getSafeRedirectPath(getSingleQueryValue(params?.next) ?? "/#pricing") : getSafeRedirectPath(getSingleQueryValue(params?.next));

    if (intent === "checkout") {
      const redirectUrl = new URL(nextPath, "http://localhost");
      redirectUrl.searchParams.set("checkout", "1");
      if (isPaystackPlanId(requestedPlan)) {
        redirectUrl.searchParams.set("plan", requestedPlan);
      }
      redirect(`${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}` as Parameters<typeof redirect>[0]);
    }

    redirect(nextPath as Parameters<typeof redirect>[0]);
  }

  return (
    <main className="container-shell min-h-screen py-10">
      <LoginForm />
    </main>
  );
}
