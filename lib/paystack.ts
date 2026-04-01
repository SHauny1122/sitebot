export type PaystackPlanId = "monthly" | "yearly";

export type PaystackPlanConfig = {
  id: PaystackPlanId;
  name: string;
  amountDisplay: string;
  amountMinor: number;
  currency: "ZAR";
  intervalLabel: string;
};

export const PAYSTACK_PLANS: Record<PaystackPlanId, PaystackPlanConfig> = {
  monthly: {
    id: "monthly",
    name: "Starter Monthly",
    amountDisplay: "R169.99",
    amountMinor: 16999,
    currency: "ZAR",
    intervalLabel: "month"
  },
  yearly: {
    id: "yearly",
    name: "Starter Yearly",
    amountDisplay: "R829.99",
    amountMinor: 82999,
    currency: "ZAR",
    intervalLabel: "year"
  }
};

export function isPaystackPlanId(value: unknown): value is PaystackPlanId {
  return value === "monthly" || value === "yearly";
}
