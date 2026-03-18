export const FREE_MESSAGE_LIMIT = 500;

export type PlanType = "free" | "pro";

export function canCreateBot(plan: PlanType, currentCount: number) {
  if (plan === "pro") {
    return true;
  }
  return currentCount < 1;
}

export function canSendMessage(plan: PlanType, usedCount: number) {
  if (plan === "pro") {
    return true;
  }
  return usedCount < FREE_MESSAGE_LIMIT;
}

export function monthKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
