"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserAction, type ActionState } from "@/features/auth/actions";

const initialState: ActionState = { ok: false };

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;
  state: string | null;
  gstin: string | null;
};

export function EditUserForm({ user }: { user: User }) {
  const [state, action, pending] = useActionState(updateUserAction, initialState);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="id" value={user.id} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="eu-name">Name</Label>
        <Input id="eu-name" name="name" defaultValue={user.name} required />
        {state.fieldErrors?.name?.map((e) => (
          <p key={e} className="text-sm text-destructive">{e}</p>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="eu-email">Email</Label>
        <Input id="eu-email" name="email" type="email" defaultValue={user.email} required />
        {state.fieldErrors?.email?.map((e) => (
          <p key={e} className="text-sm text-destructive">{e}</p>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="eu-phone">Phone</Label>
        <Input id="eu-phone" name="phone" defaultValue={user.phone ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="eu-role">Role</Label>
        <select
          id="eu-role"
          name="role"
          defaultValue={user.role}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="ADMIN">ADMIN</option>
          <option value="INTERNAL">INTERNAL</option>
          <option value="PORTAL">PORTAL</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="eu-address">Address</Label>
        <Input id="eu-address" name="address" defaultValue={user.address ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="eu-state">State</Label>
        <Input id="eu-state" name="state" defaultValue={user.state ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="eu-gstin">GSTIN</Label>
        <Input id="eu-gstin" name="gstin" defaultValue={user.gstin ?? ""} />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
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