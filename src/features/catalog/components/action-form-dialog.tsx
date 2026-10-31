"use client";

import { useActionState, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionState, FieldErrors } from "@/features/catalog/types";
import { useFormPersist } from "@/components/use-form-persist";

/**
 * Dialog + <form> wired to a Server Action through useActionState.
 * Shows field errors through the `children` render function, toasts on success/error
 * and closes the dialog when the action succeeds.
 */
export function ActionFormDialog({
  trigger,
  title,
  description,
  action,
  submitLabel = "Save",
  children,
  className,
  onSuccess,
}: {
  /** The element that opens the dialog, usually a <Button>. */
  trigger: ReactElement;
  title: string;
  description?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel?: string;
  children: (errors: FieldErrors) => ReactNode;
  className?: string;
  onSuccess?: (state: NonNullable<ActionState>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, null);
  const lastHandled = useRef<ActionState>(null);
  const { formRef, wrap } = useFormPersist(state);

  useEffect(() => {
    if (!state || state === lastHandled.current) return;
    lastHandled.current = state;
    if (state.ok) {
      toast.success(state.message ?? "Saved");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- closing the dialog in response to a completed server action
      setOpen(false);
      onSuccess?.(state);
    } else if (state.message && !state.errors) {
      toast.error(state.message);
    }
  }, [state, onSuccess]);

  const errors: FieldErrors = state && !state.ok ? state.errors ?? {} : {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className={className ?? "sm:max-w-lg"}>
        <form ref={formRef} action={wrap(formAction)} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-0.5">
            {children(errors)}
            {state && !state.ok && state.message && state.errors && Object.keys(state.errors).length === 0 && (
              <p role="alert" className="text-sm text-destructive">
                {state.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
