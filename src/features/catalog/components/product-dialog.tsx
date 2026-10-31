"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProductAction, updateProductAction } from "@/features/catalog/actions/products";
import { PRODUCT_TYPES } from "@/features/catalog/schemas";
import { ActionFormDialog } from "./action-form-dialog";
import { FieldError } from "./field-error";
import { FormSelect, type SelectOption } from "./form-select";
import { FormSwitch } from "./form-switch";

export type ProductFormValues = {
  id: string;
  name: string;
  type: string;
  salesPrice: number;
  costPrice: number;
  notes: string | null;
  taxId: string | null;
  active: boolean;
};

const TYPE_OPTIONS: SelectOption[] = PRODUCT_TYPES.map((t) => ({ value: t, label: t === "SERVICE" ? "Service" : "Goods" }));

/** Create (no `product`) or edit (with `product`) a product. New products open their detail page. */
export function ProductDialog({
  product,
  taxes,
  triggerLabel = "New product",
}: {
  product?: ProductFormValues;
  taxes: SelectOption[];
  triggerLabel?: string;
}) {
  const router = useRouter();
  const editing = Boolean(product);
  const action = product ? updateProductAction.bind(null, product.id) : createProductAction;

  return (
    <ActionFormDialog
      action={action}
      title={editing ? "Edit product" : "New product"}
      description="Variants and their extra prices are managed on the product page."
      submitLabel={editing ? "Save changes" : "Create product"}
      onSuccess={(state) => {
        if (!editing && state.id) router.push(`/products/${state.id}`);
      }}
      trigger={
        editing ? (
          <Button variant="outline" size="sm">
            <Pencil /> Edit
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
            <Label htmlFor="product-name">Name</Label>
            <Input id="product-name" name="name" defaultValue={product?.name} placeholder="Cloud ERP Seat" aria-invalid={Boolean(errors.name)} />
            <FieldError errors={errors.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="product-type">Type</Label>
              <FormSelect id="product-type" name="type" options={TYPE_OPTIONS} defaultValue={product?.type ?? "SERVICE"} invalid={Boolean(errors.type)} />
              <FieldError errors={errors.type} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="product-tax">Tax</Label>
              <FormSelect
                id="product-tax"
                name="taxId"
                options={taxes}
                defaultValue={product?.taxId ?? ""}
                allowEmpty
                emptyLabel="No tax"
                placeholder="No tax"
                invalid={Boolean(errors.taxId)}
              />
              <FieldError errors={errors.taxId} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="product-sales">Sales price (₹)</Label>
              <Input id="product-sales" name="salesPrice" type="number" step="0.01" inputMode="decimal" defaultValue={product?.salesPrice} placeholder="1500" aria-invalid={Boolean(errors.salesPrice)} />
              <FieldError errors={errors.salesPrice} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="product-cost">Cost price (₹)</Label>
              <Input id="product-cost" name="costPrice" type="number" step="0.01" inputMode="decimal" defaultValue={product?.costPrice} placeholder="900" aria-invalid={Boolean(errors.costPrice)} />
              <FieldError errors={errors.costPrice} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-notes">Notes</Label>
            <Textarea id="product-notes" name="notes" defaultValue={product?.notes ?? ""} placeholder="Internal description shown to staff" rows={3} aria-invalid={Boolean(errors.notes)} />
            <FieldError errors={errors.notes} />
          </div>
          <FormSwitch
            name="active"
            label="Active"
            description="Inactive products stay on existing subscriptions but cannot be added to new ones."
            defaultChecked={product?.active ?? true}
          />
        </>
      )}
    </ActionFormDialog>
  );
}
