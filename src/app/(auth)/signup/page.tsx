"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction, type ActionState } from "@/features/auth/actions";

const initialState: ActionState = { ok: false };

export default function SignupPage() {
  const [state, action, pending] = useActionState(signupAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pw, setPw] = useState("");
  const rules = [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "An uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "A lowercase letter", ok: /[a-z]/.test(pw) },
    { label: "A special character (e.g. @ # !)", ok: /[^A-Za-z0-9]/.test(pw) },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Public registration creates a customer (portal) account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required />
              {state.fieldErrors?.name?.map((e) => (
                <p key={e} className="text-sm text-destructive">{e}</p>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
              {state.fieldErrors?.email?.map((e) => (
                <p key={e} className="text-sm text-destructive">{e}</p>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" name="phone" type="tel" />
              {state.fieldErrors?.phone?.map((e) => (
                <p key={e} className="text-sm text-destructive">{e}</p>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  onChange={(e) => setPw(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {state.fieldErrors?.password?.map((e) => (
                <p key={e} className="text-sm text-destructive">{e}</p>
              ))}
              <ul className="grid gap-1 text-xs sm:grid-cols-2" aria-live="polite">
                {rules.map((r) => (
                  <li key={r.label} className={r.ok ? "flex items-center gap-1 text-emerald-600" : "flex items-center gap-1 text-muted-foreground"}>
                    {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {r.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {state.fieldErrors?.confirmPassword?.map((e) => (
                <p key={e} className="text-sm text-destructive">{e}</p>
              ))}
            </div>
            {state.message && <p className="text-sm text-destructive">{state.message}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Creating account..." : "Sign up"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/login" className="text-primary underline-offset-4 hover:underline">
                Sign in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}