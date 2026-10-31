"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/** shadcn Switch that always submits "true" / "false" through a hidden input. */
export function FormSwitch({
  name,
  label,
  description,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  const id = `switch-${name}`;
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <Switch id={id} checked={checked} onCheckedChange={(c) => setChecked(c)} />
    </div>
  );
}
