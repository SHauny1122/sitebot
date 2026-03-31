import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { isPaystackPlanId } from "@/lib/paystack";

type LoginPageProps = {
  searchParams?: Promise<{
    intent?: string;
    next?: string;
    plan?: string;
  }>;
};

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
  const user = await getCurrentUser();
  if (user) {
    const intent = params?.intent;
    const requestedPlan = params?.plan;
    const nextPath = getSafeRedirectPath(params?.next);

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
