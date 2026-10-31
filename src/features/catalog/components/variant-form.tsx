"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addVariantAction } from "@/features/catalog/actions/products";
import { FieldError } from "./field-error";

/** Inline "add variant" row on the product detail page (ADMIN only). */
export function VariantForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(addVariantAction.bind(null, productId), null);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<typeof state>(null);

  useEffect(() => {
    if (!state || state === handled.current) return;
    handled.current = state;
    if (state.ok) {
      toast.success(state.message ?? "Variant added");
      formRef.current?.reset();
    } else if (state.message && !state.errors) {
      toast.error(state.message);
    }
  }, [state]);

  const errors = state && !state.ok ? state.errors ?? {} : {};

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-start">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="variant-attribute">Attribute</Label>
        <Input id="variant-attribute" name="attribute" placeholder="Brand" aria-invalid={Boolean(errors.attribute)} />
        <FieldError errors={errors.attribute} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="variant-value">Value</Label>
        <Input id="variant-value" name="value" placeholder="Odoo" aria-invalid={Boolean(errors.value)} />
        <FieldError errors={errors.value} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="variant-extra">Extra price (₹)</Label>
        <Input id="variant-extra" name="extraPrice" type="number" step="0.01" inputMode="decimal" placeholder="560" defaultValue={0} aria-invalid={Boolean(errors.extraPrice)} />
        <FieldError errors={errors.extraPrice} />
      </div>
      <Button type="submit" disabled={pending} className="sm:mt-[22px]">
        <Plus /> {pending ? "Adding..." : "Add variant"}
      </Button>
    </form>
  );
}
