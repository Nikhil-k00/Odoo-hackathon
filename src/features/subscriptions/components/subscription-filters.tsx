"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUBSCRIPTION_STATUSES } from "../status";

const ALL = "ALL";

export function SubscriptionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== ALL) next.set(key, value); else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-col gap-2 md:flex-row">
      <Input className="md:w-72" placeholder="Search number or customer…" defaultValue={params.get("q") ?? ""}
        onChange={(e) => update("q", e.target.value)} />
      <Select value={params.get("status") ?? ALL} onValueChange={(v) => update("status", v ?? "")}>
        <SelectTrigger className="md:w-44"><SelectValue>{params.get("status") ?? "All statuses"}</SelectValue></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {SUBSCRIPTION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
