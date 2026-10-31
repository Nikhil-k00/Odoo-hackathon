"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { useFormPersist } from "@/components/use-form-persist";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserAction, type ActionState } from "@/features/auth/actions";

const initialState: ActionState = { ok: false };

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, initialState);
  const { formRef, wrap } = useFormPersist(state);

  return (
    <form ref={formRef} action={wrap(action)} className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="cu-name">Name</Label>
        <Input id="cu-name" name="name" required />
        {state.fieldErrors?.name?.map((e) => (
          <p key={e} className="text-sm text-destructive">{e}</p>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cu-email">Email</Label>
        <Input id="cu-email" name="email" type="email" required />
        {state.fieldErrors?.email?.map((e) => (
          <p key={e} className="text-sm text-destructive">{e}</p>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cu-password">Password</Label>
        <Input id="cu-password" name="password" type="password" required />
        {state.fieldErrors?.password?.map((e) => (
          <p key={e} className="text-sm text-destructive">{e}</p>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cu-phone">Phone</Label>
        <Input id="cu-phone" name="phone" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cu-address">Address</Label>
        <Input id="cu-address" name="address" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cu-state">State</Label>
        <Input id="cu-state" name="state" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cu-gstin">GSTIN</Label>
        <Input id="cu-gstin" name="gstin" />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create internal user"}
        </Button>
      </div>
      {state.message && (
        <p className={`text-sm md:col-span-2 ${state.ok ? "text-green-600" : "text-destructive"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}