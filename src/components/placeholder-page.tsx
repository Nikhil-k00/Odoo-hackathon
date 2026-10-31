import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Temporary page shown until the owning lane replaces this route.
 * Lane owners: delete the placeholder page.tsx and build your real page.
 */
export function PlaceholderPage({ title, owner, description }: { title: string; owner: string; description: string }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Badge variant="outline">Coming soon</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Under construction</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This route is owned by <span className="font-medium text-foreground">{owner}</span> and will be
          replaced when that lane merges.
        </CardContent>
      </Card>
    </div>
  );
}
