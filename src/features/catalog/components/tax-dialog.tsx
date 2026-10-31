"use client";

import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTaxAction, updateTaxAction } from "@/features/catalog/actions/taxes";
import { ActionFormDialog } from "./action-form-dialog";
import { FieldError } from "./field-error";

export type TaxFormValues = { id: string; name: string; percent: number };

/** Create (no `tax`) or edit (with `tax`) a tax in a dialog. */
export function TaxDialog({ tax, triggerLabel = "New tax" }: { tax?: TaxFormValues; triggerLabel?: string }) {
  const editing = Boolean(tax);
  const action = tax ? updateTaxAction.bind(null, tax.id) : createTaxAction;

  return (
    <ActionFormDialog
      action={action}
      title={editing ? "Edit tax" : "New tax"}
      description="Taxes are applied per product and copied to subscription lines."
      submitLabel={editing ? "Save changes" : "Create tax"}
      className="sm:max-w-md"
      trigger={
        editing ? (
          <Button variant="ghost" size="icon-sm" aria-label="Edit tax">
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
            <Label htmlFor="tax-name">Name</Label>
            <Input id="tax-name" name="name" defaultValue={tax?.name} placeholder="GST 18%" aria-invalid={Boolean(errors.name)} />
            <FieldError errors={errors.name} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tax-percent">Percent (0 - 100)</Label>
            <Input
              id="tax-percent"
              name="percent"
              type="number"
              step="0.01"
              inputMode="decimal"
              defaultValue={tax?.percent}
              placeholder="18"
              aria-invalid={Boolean(errors.percent)}
            />
            <FieldError errors={errors.percent} />
          </div>
        </>
      )}
    </ActionFormDialog>
  );
}
