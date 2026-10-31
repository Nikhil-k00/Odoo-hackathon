import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

/** Shown instead of a table when a catalog list has no rows. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  /** Usually the "Create first ..." dialog trigger; omitted for view-only roles. */
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        {icon && <div className="rounded-full bg-muted p-3 text-muted-foreground [&_svg]:size-6">{icon}</div>}
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
