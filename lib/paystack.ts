export type PaystackPlanId = "monthly" | "yearly";

export type PaystackPlanConfig = {
  id: PaystackPlanId;
  name: string;
  amountDisplay: string;
  amountMinor: number;
  currency: "USD";
  intervalLabel: string;
};

export const PAYSTACK_PLANS: Record<PaystackPlanId, PaystackPlanConfig> = {
  monthly: {
    id: "monthly",
    name: "Starter Monthly",
    amountDisplay: "$9.99",
    amountMinor: 999,
    currency: "USD",
    intervalLabel: "month"
  },
  yearly: {
    id: "yearly",
    name: "Starter Yearly",
    amountDisplay: "$49",
    amountMinor: 4900,
    currency: "USD",
    intervalLabel: "year"
  }
};

export function isPaystackPlanId(value: unknown): value is PaystackPlanId {
  return value === "monthly" || value === "yearly";
}
