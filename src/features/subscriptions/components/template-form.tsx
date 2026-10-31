"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/money";
import { saveTemplate } from "../actions";
import type { FormOptions } from "../queries";
import type { TemplateInput } from "../schemas";
import { FieldError } from "./field-error";

type Line = { productId: string; quantity: number };
type Props = { options: FormOptions; templateId?: string; initial?: TemplateInput };

export function TemplateForm({ options, templateId, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState(initial?.name ?? "");
  const [validityDays, setValidityDays] = useState(String(initial?.validityDays ?? 30));
  const [planId, setPlanId] = useState(initial?.planId ?? "");
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? [{ productId: "", quantity: 1 }]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await saveTemplate(templateId ?? null, {
        name,
        validityDays: Number(validityDays),
        planId,
        lines: lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
      });
      if (res.ok) {
        toast.success(templateId ? "Template updated" : "Template created");
        router.push("/templates");
        router.refresh();
      } else {
        setErrors(res.errors);
        toast.error(res.errors._form ?? "Please fix the highlighted fields");
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Template details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Starter Monthly" />
            <FieldError message={errors.name} />
          </div>
          <div>
            <Label htmlFor="validity">Quotation validity (days)</Label>
            <Input id="validity" type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(e.target.value)} />
            <FieldError message={errors.validityDays} />
          </div>
          <div>
            <Label>Recurring plan</Label>
            <Select value={planId} onValueChange={(v) => setPlanId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {options.plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {formatINR(p.price)} / {p.billingPeriod.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.planId} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Product lines</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, { productId: "", quantity: 1 }])}>
            <Plus className="h-4 w-4" /> Add line
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FieldError message={errors.lines} />
          {lines.map((line, i) => (
            <div key={i} className="grid items-end gap-3 md:grid-cols-[1fr_140px_40px]">
              <div>
                <Label>Product</Label>
                <Select value={line.productId} onValueChange={(v) => setLine(i, { productId: v ?? "" })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {formatINR(p.salesPrice)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors[`lines.${i}.productId`]} />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min={1} value={line.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} />
                <FieldError message={errors[`lines.${i}.quantity`]} />
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Remove line" disabled={lines.length === 1}
                onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : templateId ? "Save changes" : "Create template"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/templates")}>Cancel</Button>
      </div>
    </form>
  );
}
