"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SelectOption = { value: string; label: string };

/**
 * shadcn Select that participates in a plain <form>: the chosen value is submitted
 * through a hidden input named `name`. Empty string means "nothing selected".
 */
export function FormSelect({
  name,
  options,
  defaultValue = "",
  placeholder = "Select...",
  allowEmpty,
  emptyLabel = "None",
  invalid,
  onChange,
  id,
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  /** Adds a "None" option that submits "" */
  allowEmpty?: boolean;
  emptyLabel?: string;
  invalid?: boolean;
  onChange?: (value: string) => void;
  id?: string;
}) {
  const [value, setValue] = useState<string>(defaultValue);
  const items = allowEmpty ? [{ value: "", label: emptyLabel }, ...options] : options;
  const current = items.find((o) => o.value === value);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select
        value={value}
        onValueChange={(v) => {
          const next = (v as string | null) ?? "";
          setValue(next);
          onChange?.(next);
        }}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined}>
          <SelectValue>
            {current && current.value !== "" ? (
              current.label
            ) : (
              <span className="text-muted-foreground">{current ? current.label : placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {items.map((o) => (
            <SelectItem key={o.value || "__none"} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
