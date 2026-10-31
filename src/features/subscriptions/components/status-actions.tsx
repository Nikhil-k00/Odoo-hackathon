"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { changeStatus, portalChangeStatus } from "../actions";
import { allowedTransitions, TRANSITION_LABELS, type PlanFlags, type SubscriptionStatus } from "../status";

type Props = { id: string; status: string; plan: PlanFlags; portal?: boolean };

/** Renders only the transitions the status machine allows; the server re-checks them. */
export function StatusActions({ id, status, plan, portal = false }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  let targets = allowedTransitions(status, plan);
  if (portal) targets = targets.filter((t) => ["CONFIRMED", "PAUSED", "ACTIVE", "CLOSED"].includes(t));
  if (targets.length === 0) return <p className="text-sm text-muted-foreground">No further actions.</p>;

  const run = (target: SubscriptionStatus) =>
    start(async () => {
      const res = portal ? await portalChangeStatus(id, target) : await changeStatus(id, target);
      if (res.ok) { toast.success(`Status: ${target}`); router.refresh(); }
      else toast.error(res.errors._form ?? "Transition not allowed");
    });

  return (
    <div className="flex flex-wrap gap-2">
      {targets.map((t) => (
        <Button key={t} size="sm" disabled={pending}
          variant={t === "CLOSED" ? "destructive" : t === "DRAFT" ? "outline" : "default"} onClick={() => run(t)}>
          {portal && t === "CONFIRMED" ? "Accept quotation" : TRANSITION_LABELS[t]}
        </Button>
      ))}
    </div>
  );
}
