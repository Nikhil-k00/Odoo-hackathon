import { z } from "zod";
import type { ActionState, FieldErrors } from "@/features/catalog/types";

/** Converts a failed Zod parse into the ActionState error shape. */
export function invalid(error: z.ZodError): ActionState {
  const { fieldErrors, formErrors } = z.flattenError(error);
  return {
    ok: false,
    errors: fieldErrors as FieldErrors,
    message: formErrors[0] ?? "Please fix the highlighted fields",
  };
}

/** Reads a FormData into a plain object; keys listed in `multi` keep every value as an array. */
export function formToObject(formData: FormData, multi: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue; // Next.js internal fields
    out[key] = multi.includes(key) ? formData.getAll(key) : formData.get(key);
  }
  for (const key of multi) if (!(key in out)) out[key] = [];
  return out;
}
