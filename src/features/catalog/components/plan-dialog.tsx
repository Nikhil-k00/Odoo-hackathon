"use client";

import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPlanAction, updatePlanAction } from "@/features/catalog/actions/plans";
import { BILLING_PERIODS } from "@/features/catalog/schemas";
import { ActionFormDialog } from "./action-form-dialog";
import { FieldError } from "./field-error";
import { FormSelect, type SelectOption } from "./form-select";
import { FormSwitch } from "./form-switch";

export type PlanFormValues = {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  minQuantity: number;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  autoClose: boolean;
  closable: boolean;
  pausable: boolean;
  renewable: boolean;
};

const PERIOD_OPTIONS: SelectOption[] = BILLING_PERIODS.map((p) => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase() }));

/** Create (no `plan`) or edit (with `plan`) a recurring plan. */
export function PlanDialog({ plan, triggerLabel = "New plan" }: { plan?: PlanFormValues; triggerLabel?: string }) {
  const editing = Boolean(plan);
  const action = plan ? updatePlanAction.bind(null, plan.id) : createPlanAction;

  return (
    <ActionFormDialog
      action={action}
      title={editing ? "Edit plan" : "New recurring plan"}
      description="A plan sets how often a subscription is billed and what the customer may do with it."
      submitLabel={editing ? "Save changes" : "Create plan"}
      trigger={
        editing ? (
          <Button variant="ghost" size="icon-sm" aria-label="Edit plan">
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> {triggerLabel}
          </Button>
        )
      }
    >
      {(errors) => (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-name">Name</Label>
            <Input id="plan-name" name="name" defaultValue={plan?.name} placeholder="Monthly" aria-invalid={Boolean(errors.name)} />
            <FieldError errors={errors.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-price">Price (₹)</Label>
              <Input id="plan-price" name="price" type="number" step="0.01" inputMode="decimal" defaultValue={plan?.price} placeholder="999" aria-invalid={Boolean(errors.price)} />
              <FieldError errors={errors.price} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-period">Billing period</Label>
              <FormSelect id="plan-period" name="billingPeriod" options={PERIOD_OPTIONS} defaultValue={plan?.billingPeriod ?? "MONTHLY"} invalid={Boolean(errors.billingPeriod)} />
              <FieldError errors={errors.billingPeriod} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-minqty">Min quantity</Label>
              <Input id="plan-minqty" name="minQuantity" type="number" step="1" min={1} inputMode="numeric" defaultValue={plan?.minQuantity ?? 1} aria-invalid={Boolean(errors.minQuantity)} />
              <FieldError errors={errors.minQuantity} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-start">Start date</Label>
              <Input id="plan-start" name="startDate" type="date" defaultValue={plan?.startDate} aria-invalid={Boolean(errors.startDate)} />
              <FieldError errors={errors.startDate} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-end">End date (optional)</Label>
              <Input id="plan-end" name="endDate" type="date" defaultValue={plan?.endDate ?? ""} aria-invalid={Boolean(errors.endDate)} />
              <FieldError errors={errors.endDate} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormSwitch name="autoClose" label="Auto close" description="Close when the subscription passes its expiration date." defaultChecked={plan?.autoClose ?? false} />
            <FormSwitch name="closable" label="Closable" description="Customer or staff may close early." defaultChecked={plan?.closable ?? true} />
            <FormSwitch name="pausable" label="Pausable" description="Allows ACTIVE to PAUSED and back." defaultChecked={plan?.pausable ?? false} />
            <FormSwitch name="renewable" label="Renewable" description="Can be renewed after it ends." defaultChecked={plan?.renewable ?? true} />
          </div>
        </>
      )}
    </ActionFormDialog>
  );
}
