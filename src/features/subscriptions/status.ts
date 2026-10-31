/**
 * Subscription status machine. Single source of truth: the Server Action enforces it,
 * the UI only renders the buttons this file allows.
 *
 * DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED ; ACTIVE <-> PAUSED (if plan.pausable)
 */
export const SUBSCRIPTION_STATUSES = ["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "PAUSED", "CLOSED"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type PlanFlags = { pausable: boolean; closable: boolean };

/** Static transitions; plan-dependent ones are filtered in allowedTransitions(). */
export const TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  DRAFT: ["QUOTATION"],
  QUOTATION: ["CONFIRMED", "DRAFT"],
  CONFIRMED: ["ACTIVE"],
  ACTIVE: ["PAUSED", "CLOSED"],
  PAUSED: ["ACTIVE", "CLOSED"],
  CLOSED: [],
};

/** Transitions available for this subscription given its plan flags. */
export function allowedTransitions(status: string, plan: PlanFlags): SubscriptionStatus[] {
  const base = TRANSITIONS[status as SubscriptionStatus] ?? [];
  return base.filter((target) => {
    if (target === "PAUSED" && !plan.pausable) return false;
    if (target === "CLOSED" && !plan.closable) return false;
    return true;
  });
}

export function canTransition(status: string, target: string, plan: PlanFlags): boolean {
  return allowedTransitions(status, plan).includes(target as SubscriptionStatus);
}

/** Lines (products, quantities, prices) may only change before the deal is confirmed. */
export function canEditLines(status: string): boolean {
  return status === "DRAFT" || status === "QUOTATION";
}

/** Button labels for each target status. */
export const TRANSITION_LABELS: Record<SubscriptionStatus, string> = {
  DRAFT: "Back to Draft",
  QUOTATION: "Send Quotation",
  CONFIRMED: "Confirm",
  ACTIVE: "Activate",
  PAUSED: "Pause",
  CLOSED: "Close",
};

/** shadcn Badge variant per status. */
export function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "CONFIRMED":
    case "QUOTATION":
      return "secondary";
    case "CLOSED":
      return "destructive";
    default:
      return "outline";
  }
}

export const DEFAULT_QUOTE_VALIDITY_DAYS = 30;
