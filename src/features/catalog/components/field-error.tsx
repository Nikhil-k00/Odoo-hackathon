import { cn } from "@/lib/utils";

/** Inline validation message shown under a form field. */
export function FieldError({ errors, className }: { errors?: string[]; className?: string }) {
  if (!errors || errors.length === 0) return null;
  return (
    <p role="alert" className={cn("text-xs text-destructive", className)}>
      {errors[0]}
    </p>
  );
}
