"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR, round2 } from "@/lib/money";
import { createSubscription, updateSubscription } from "../actions";
import type { FormOptions } from "../queries";
import type { SubscriptionInput } from "../schemas";
import { FieldError } from "./field-error";

type Line = { productId: string; variantId: string; taxId: string; quantity: number; unitPrice: number };
type Props = { options: FormOptions; subscriptionId?: string; initial?: SubscriptionInput; initialTemplateId?: string };

const NONE = "__none__";
const emptyLine = (): Line => ({ productId: "", variantId: "", taxId: "", quantity: 1, unitPrice: 0 });
const toDateInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export function SubscriptionForm({ options, subscriptionId, initial, initialTemplateId }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "");
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [planId, setPlanId] = useState(initial?.planId ?? "");
  const [startDate, setStartDate] = useState(toDateInput(initial?.startDate) || new Date().toISOString().slice(0, 10));
  const [expirationDate, setExpirationDate] = useState(toDateInput(initial?.expirationDate));
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? "Immediate");
  const [discountId, setDiscountId] = useState(initial?.discountId ?? "");
  const [lines, setLines] = useState<Line[]>(
    initial?.lines.map((l) => ({
      productId: l.productId, variantId: l.variantId ?? "", taxId: l.taxId ?? "", quantity: l.quantity, unitPrice: l.unitPrice,
    })) ?? [emptyLine()]
  );

  const plan = options.plans.find((p) => p.id === planId);
  const productById = useMemo(() => new Map(options.products.map((p) => [p.id, p])), [options.products]);

  /** unitPrice = salesPrice + variant.extraPrice; tax defaults to the product tax. */
  const priceFor = (productId: string, variantId: string) => {
    const p = productById.get(productId);
    if (!p) return 0;
    const v = p.variants.find((x) => x.id === variantId);
    return round2(p.salesPrice + (v?.extraPrice ?? 0));
  };

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const onProduct = (i: number, productId: string) => {
    const p = productById.get(productId);
    setLine(i, { productId, variantId: "", taxId: p?.taxId ?? "", unitPrice: priceFor(productId, ""), quantity: Math.max(1, plan?.minQuantity ?? 1) });
  };
  const onVariant = (i: number, variantId: string) => {
    const v = variantId === NONE ? "" : variantId;
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, variantId: v, unitPrice: priceFor(l.productId, v) } : l)));
  };

  /** "Start from template": prefill plan and lines, keep customer and dates. */
  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = options.templates.find((x) => x.id === id);
    if (!t) return;
    setPlanId(t.planId);
    setLines(t.lines.map((l) => {
      const p = productById.get(l.productId);
      return { productId: l.productId, variantId: "", taxId: p?.taxId ?? "", quantity: l.quantity, unitPrice: priceFor(l.productId, "") };
    }));
    toast.message(`Template "${t.name}" applied`);
  };

  const subtotal = lines.reduce((s, l) => s + round2(l.unitPrice * l.quantity), 0);
  const taxTotal = lines.reduce((s, l) => {
    const t = options.taxes.find((x) => x.id === l.taxId);
    return s + round2(l.unitPrice * l.quantity) * ((t?.percent ?? 0) / 100);
  }, 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: SubscriptionInput = {
      customerId, planId, startDate, expirationDate: expirationDate || null, paymentTerms,
      discountId: discountId || null,
      lines: lines.map((l) => ({ productId: l.productId, variantId: l.variantId || null, taxId: l.taxId || null, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
    };
    start(async () => {
      const templateName = options.templates.find((t) => t.id === templateId)?.name ?? null;
      const res = subscriptionId ? await updateSubscription(subscriptionId, payload) : await createSubscription(payload, templateName);
      if (res.ok) {
        toast.success(subscriptionId ? "Subscription updated" : "Subscription created as Draft");
        router.push(`/subscriptions/${res.id}`);
        router.refresh();
      } else {
        setErrors(res.errors);
        toast.error(res.errors._form ?? "Please fix the highlighted fields");
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {!subscriptionId && options.templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Start from template</CardTitle>
            <CardDescription>Optional. Prefills the plan and product lines; you can still edit everything.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={templateId} onValueChange={(v) => v && applyTemplate(v)}>
              <SelectTrigger className="w-full md:w-96"><SelectValue placeholder="Choose a template">{options.templates.find((t) => t.id === templateId)?.name}</SelectValue></SelectTrigger>
              <SelectContent>
                {options.templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Subscription details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose a customer">{options.customers.find((c) => c.id === customerId)?.name}</SelectValue></SelectTrigger>
              <SelectContent>
                {options.customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.email}</SelectItem>)}
              </SelectContent>
            </Select>
            <FieldError message={errors.customerId} />
          </div>
          <div>
            <Label>Recurring plan</Label>
            <Select value={planId} onValueChange={(v) => setPlanId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose a plan">{plan ? `${plan.name} · ${formatINR(plan.price)} / ${plan.billingPeriod.toLowerCase()}` : undefined}</SelectValue></SelectTrigger>
              <SelectContent>
                {options.plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} · {formatINR(p.price)} / {p.billingPeriod.toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.planId} />
            {plan && <p className="mt-1 text-xs text-muted-foreground">Min quantity {plan.minQuantity} · {plan.pausable ? "pausable" : "not pausable"} · {plan.closable ? "closable" : "not closable"}</p>}
          </div>
          <div>
            <Label htmlFor="terms">Payment terms</Label>
            <Input id="terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Immediate, Net 15, Net 30" />
            <FieldError message={errors.paymentTerms} />
          </div>
          <div>
            <Label htmlFor="start">Start date</Label>
            <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <FieldError message={errors.startDate} />
          </div>
          <div>
            <Label htmlFor="exp">Expiration date (optional)</Label>
            <Input id="exp" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
            <FieldError message={errors.expirationDate} />
          </div>
          <div>
            <Label>Discount (optional)</Label>
            <Select value={discountId || NONE} onValueChange={(v) => setDiscountId(!v || v === NONE ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="No discount">{discountId ? options.discounts.find((d) => d.id === discountId)?.name : "No discount"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No discount</SelectItem>
                {options.discounts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name} · {d.type === "PERCENT" ? `${d.value}%` : formatINR(d.value)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.discountId} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Lines</CardTitle>
            <CardDescription>Unit price = sales price + variant extra. Amount updates live.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, { ...emptyLine(), quantity: plan?.minQuantity ?? 1 }])}>
            <Plus className="h-4 w-4" /> Add line
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldError message={errors.lines} />
          {lines.map((line, i) => {
            const product = productById.get(line.productId);
            const amount = round2(line.unitPrice * line.quantity);
            return (
              <div key={i} className="grid items-end gap-3 rounded-md border p-3 md:grid-cols-[2fr_1.5fr_1.2fr_90px_130px_120px_40px]">
                <div>
                  <Label>Product</Label>
                  <Select value={line.productId} onValueChange={(v) => v && onProduct(i, v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Choose">{product?.name}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {options.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors[`lines.${i}.productId`]} />
                </div>
                <div>
                  <Label>Variant</Label>
                  <Select value={line.variantId || NONE} onValueChange={(v) => onVariant(i, v ?? NONE)} disabled={!product || product.variants.length === 0}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="None">{(() => { const v = product?.variants.find((x) => x.id === line.variantId); return v ? `${v.attribute}: ${v.value}` : "None"; })()}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {product?.variants.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.attribute}: {v.value} (+{formatINR(v.extraPrice)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors[`lines.${i}.variantId`]} />
                </div>
                <div>
                  <Label>Tax</Label>
                  <Select value={line.taxId || NONE} onValueChange={(v) => setLine(i, { taxId: !v || v === NONE ? "" : v })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="No tax">{line.taxId ? options.taxes.find((t) => t.id === line.taxId)?.name : "No tax"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No tax</SelectItem>
                      {options.taxes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Qty</Label>
                  <Input type="number" min={1} value={line.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} />
                  <FieldError message={errors[`lines.${i}.quantity`]} />
                </div>
                <div>
                  <Label>Unit price</Label>
                  <Input type="number" min={0} step="0.01" value={line.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })} />
                  <FieldError message={errors[`lines.${i}.unitPrice`]} />
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="h-9 flex items-center text-sm font-medium">{formatINR(amount)}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove line" disabled={lines.length === 1}
                  onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <div className="flex flex-col items-end gap-1 text-sm">
            <p>Subtotal <span className="ml-4 font-medium">{formatINR(subtotal)}</span></p>
            <p className="text-muted-foreground">Est. tax <span className="ml-4">{formatINR(taxTotal)}</span></p>
            <p className="text-base font-semibold">Total <span className="ml-4">{formatINR(subtotal + taxTotal)}</span></p>
          </div>
        </CardContent>
      </Card>

      <FieldError message={errors._form} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : subscriptionId ? "Save changes" : "Create subscription"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
