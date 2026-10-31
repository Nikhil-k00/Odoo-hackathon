"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveCustomer } from "../customers";
import type { CustomerInput } from "../customer-schema";

const STATES = ["Kerala", "Karnataka", "Tamil Nadu", "Maharashtra", "Delhi", "Gujarat", "Telangana", "Andhra Pradesh", "West Bengal", "Other"];

type Props = { customerId?: string; initial?: Partial<CustomerInput> };

export function CustomerForm({ customerId, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<CustomerInput>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
    state: initial?.state ?? "",
    gstin: initial?.gstin ?? "",
    password: "",
  });
  const set = (k: keyof CustomerInput) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const err = (k: string) => (errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await saveCustomer(customerId ?? null, form);
      if (res.ok) {
        if (res.tempPassword) {
          toast.success(`Customer created. Temporary password: ${res.tempPassword}`, { duration: 15000 });
        } else {
          toast.success(customerId ? "Customer updated" : "Customer created");
        }
        router.push("/customers");
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
          <CardTitle>{customerId ? "Customer details" : "New customer"}</CardTitle>
          <CardDescription>Kerala customers are billed CGST + SGST; every other state gets IGST.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={form.name} onChange={set("name")} />
            {err("name")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" value={form.email} onChange={set("email")} />
            {err("email")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-phone">Phone</Label>
            <Input id="c-phone" value={form.phone ?? ""} onChange={set("phone")} placeholder="98765 43210" />
            {err("phone")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>State</Label>
            <Select value={form.state || undefined} onValueChange={(v) => setForm((f) => ({ ...f, state: v ?? "" }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose a state" /></SelectTrigger>
              <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {err("state")}
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="c-address">Address</Label>
            <Input id="c-address" value={form.address ?? ""} onChange={set("address")} />
            {err("address")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-gstin">GSTIN (optional)</Label>
            <Input id="c-gstin" value={form.gstin ?? ""} onChange={set("gstin")} placeholder="32ABCDE1234F1Z5" className="font-mono uppercase" />
            {err("gstin")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-password">{customerId ? "New password (leave blank to keep)" : "Password (blank = generate temporary)"}</Label>
            <Input id="c-password" type="password" value={form.password ?? ""} onChange={set("password")} autoComplete="new-password" />
            {err("password")}
          </div>
        </CardContent>
      </Card>
      {errors._form && <p className="text-sm text-destructive">{errors._form}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : customerId ? "Save changes" : "Create customer"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/customers")}>Cancel</Button>
      </div>
    </form>
  );
}
