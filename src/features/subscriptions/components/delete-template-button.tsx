"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteTemplate } from "../actions";

export function DeleteTemplateButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Delete template" />}>
        <Trash2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete template?</DialogTitle>
          <DialogDescription>&ldquo;{name}&rdquo; will be removed. Existing subscriptions are not affected.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" disabled={pending} onClick={() => start(async () => {
            const res = await deleteTemplate(id);
            if (res.ok) { toast.success("Template deleted"); setOpen(false); router.refresh(); }
            else toast.error(res.errors._form ?? "Could not delete");
          })}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
