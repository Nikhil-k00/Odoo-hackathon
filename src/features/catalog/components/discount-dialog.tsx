"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDiscountAction, updateDiscountAction } from "@/features/catalog/actions/discounts";
import { DISCOUNT_APPLIES_TO, DISCOUNT_TYPES } from "@/features/catalog/schemas";
import { ActionFormDialog } from "./action-form-dialog";
import { FieldError } from "./field-error";
import { FormSelect, type SelectOption } from "./form-select";

export type DiscountFormValues = {
  id: string;
  name: string;
  type: string;
  value: number;
  minPurchase: number;
  minQuantity: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  usageLimit: number | null;
  appliesTo: string;
  productIds: string[];
};

const TYPE_OPTIONS: SelectOption[] = DISCOUNT_TYPES.map((t) => ({ value: t, label: t === "FIXED" ? "Fixed amount (₹)" : "Percent (%)" }));
const APPLIES_OPTIONS: SelectOption[] = DISCOUNT_APPLIES_TO.map((a) => ({
  value: a,
  label: a === "PRODUCT" ? "Specific products" : "Whole subscription",
}));

/** Create (no `discount`) or edit (with `discount`) a discount. ADMIN only (enforced in the action). */
export function DiscountDialog({
  discount,
  products,
  triggerLabel = "New discount",
}: {
  discount?: DiscountFormValues;
  products: SelectOption[];
  triggerLabel?: string;
}) {
  const editing = Boolean(discount);
  const action = discount ? updateDiscountAction.bind(null, discount.id) : createDiscountAction;
  const [type, setType] = useState(discount?.type ?? "PERCENT");
  const [appliesTo, setAppliesTo] = useState(discount?.appliesTo ?? "SUBSCRIPTION");
  const [selected, setSelected] = useState<Set<string>>(new Set(discount?.productIds ?? []));

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <ActionFormDialog
      action={action}
      title={editing ? "Edit discount" : "New discount"}
      description="The billing run applies a discount only while it is active and within its limits."
      submitLabel={editing ? "Save changes" : "Create discount"}
      className="sm:max-w-xl"
      trigger={
        editing ? (
          <Button variant="ghost" size="icon-sm" aria-label="Edit discount">
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
            <Label htmlFor="discount-name">Name / code</Label>
            <Input id="discount-name" name="name" defaultValue={discount?.name} placeholder="LAUNCH10" aria-invalid={Boolean(errors.name)} />
            <FieldError errors={errors.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discount-type">Type</Label>
              <FormSelect id="discount-type" name="type" options={TYPE_OPTIONS} defaultValue={type} onChange={setType} invalid={Boolean(errors.type)} />
              <FieldError errors={errors.type} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discount-value">{type === "PERCENT" ? "Value (%, max 100)" : "Value (₹)"}</Label>
              <Input id="discount-value" name="value" type="number" step="0.01" inputMode="decimal" defaultValue={discount?.value} placeholder={type === "PERCENT" ? "10" : "500"} aria-invalid={Boolean(errors.value)} />
              <FieldError errors={errors.value} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discount-minpurchase">Min purchase (₹)</Label>
              <Input id="discount-minpurchase" name="minPurchase" type="number" step="0.01" inputMode="decimal" defaultValue={discount?.minPurchase ?? 0} aria-invalid={Boolean(errors.minPurchase)} />
              <FieldError errors={errors.minPurchase} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discount-minqty">Min quantity</Label>
              <Input id="discount-minqty" name="minQuantity" type="number" step="1" min={1} inputMode="numeric" defaultValue={discount?.minQuantity ?? 1} aria-invalid={Boolean(errors.minQuantity)} />
              <FieldError errors={errors.minQuantity} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discount-limit">Usage limit</Label>
              <Input id="discount-limit" name="usageLimit" type="number" step="1" min={1} inputMode="numeric" defaultValue={discount?.usageLimit ?? ""} placeholder="Unlimited" aria-invalid={Boolean(errors.usageLimit)} />
              <FieldError errors={errors.usageLimit} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discount-start">Start date</Label>
              <Input id="discount-start" name="startDate" type="date" defaultValue={discount?.startDate} aria-invalid={Boolean(errors.startDate)} />
              <FieldError errors={errors.startDate} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discount-end">End date</Label>
              <Input id="discount-end" name="endDate" type="date" defaultValue={discount?.endDate} aria-invalid={Boolean(errors.endDate)} />
              <FieldError errors={errors.endDate} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discount-applies">Applies to</Label>
            <FormSelect id="discount-applies" name="appliesTo" options={APPLIES_OPTIONS} defaultValue={appliesTo} onChange={setAppliesTo} invalid={Boolean(errors.appliesTo)} />
            <FieldError errors={errors.appliesTo} />
          </div>
          {appliesTo === "PRODUCT" && (
            <div className="flex flex-col gap-2">
              <Label>Products</Label>
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products yet. Create a product first.</p>
              ) : (
                <div className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2" aria-invalid={Boolean(errors.productIds)}>
                  {products.map((p) => {
                    const id = `discount-product-${p.value}`;
                    return (
                      <div key={p.value} className="flex items-center gap-2">
                        <Checkbox id={id} checked={selected.has(p.value)} onCheckedChange={(c) => toggle(p.value, c)} />
                        <Label htmlFor={id} className="cursor-pointer font-normal">
                          {p.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
              {Array.from(selected).map((id) => (
                <input key={id} type="hidden" name="productIds" value={id} />
              ))}
              <FieldError errors={errors.productIds} />
            </div>
          )}
        </>
      )}
    </ActionFormDialog>
  );
}
