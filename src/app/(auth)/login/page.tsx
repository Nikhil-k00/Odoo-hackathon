import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Placeholder owned by M2 (Auth). Replace with the real login form.
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Recurra</CardTitle>
          <CardDescription>Sign in to manage subscriptions and billing.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The login form is being built by M2. Demo accounts are listed in CLAUDE.md.
        </CardContent>
      </Card>
    </div>
  );
}
