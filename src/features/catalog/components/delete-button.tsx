"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import type { ActionState } from "@/features/catalog/types";

/**
 * Icon button that asks for confirmation, then runs a delete Server Action.
 * The action decides whether deletion is allowed (e.g. record in use) and returns a message.
 */
export function DeleteButton({
  action,
  title,
  description,
  redirectTo,
  label = "Delete",
  size = "icon-sm",
  children,
}: {
  action: () => Promise<ActionState>;
  title: string;
  description: string;
  /** Navigate here after a successful delete (used on detail pages). */
  redirectTo?: string;
  label?: string;
  size?: "icon-sm" | "sm" | "default";
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    startTransition(async () => {
      const result = await action();
      if (result?.ok) {
        toast.success(result.message ?? "Deleted");
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
      } else {
        toast.error(result?.message ?? "Could not delete");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={size === "icon-sm" ? "ghost" : "destructive"} size={size} aria-label={label} />
        }
      >
        {children ?? (
          <>
            <Trash2 className="text-destructive" />
            {size !== "icon-sm" && label}
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? "Deleting..." : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
