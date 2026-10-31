"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction, type ActionState } from "@/features/auth/actions";

const initialState: ActionState = { ok: false };

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            Enter your email. We never reveal whether an account exists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
              {state.fieldErrors?.email?.map((e) => (
                <p key={e} className="text-sm text-destructive">{e}</p>
              ))}
            </div>
            {state.message && (
              <p className="text-sm text-muted-foreground">{state.message}</p>
            )}
            {state.devResetUrl && (
              <div className="rounded-md border border-dashed p-3 text-sm">
                <p className="font-medium">Development only</p>
                <p className="text-muted-foreground">
                  No email service is configured. Use this reset link:
                </p>
                <a
                  href={state.devResetUrl}
                  className="break-all text-primary underline-offset-4 hover:underline"
                >
                  {state.devResetUrl}
                </a>
              </div>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Generating..." : "Generate reset link"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <a href="/login" className="text-primary underline-offset-4 hover:underline">
                Back to sign in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}