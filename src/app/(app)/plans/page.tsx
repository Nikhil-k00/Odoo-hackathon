import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deletePlanAction } from "@/features/catalog/actions/plans";
import { DeleteButton } from "@/features/catalog/components/delete-button";
import { EmptyState } from "@/features/catalog/components/empty-state";
import { PageHeader } from "@/features/catalog/components/page-header";
import { PlanDialog } from "@/features/catalog/components/plan-dialog";
import { titleCase, toDateInput } from "@/features/catalog/format";

const PERIOD_SUFFIX: Record<string, string> = { DAILY: "/ day", WEEKLY: "/ week", MONTHLY: "/ month", YEARLY: "/ year" };

export default async function PlansPage() {
  const session = await requireRole(["ADMIN", "INTERNAL"]);
  const canEdit = session.role === "ADMIN";

  const plans = await prisma.recurringPlan.findMany({
    orderBy: [{ price: "asc" }, { name: "asc" }],
    include: { _count: { select: { subscriptions: true, templates: true } } },
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title="Recurring plans"
        description="How often a subscription bills and what the customer is allowed to do."
        actions={canEdit ? <PlanDialog /> : undefined}
      />

      {plans.length === 0 ? (
        <EmptyState
          icon={<CalendarClock />}
          title="No plans yet"
          description="Create a Monthly plan to start selling subscriptions."
          action={canEdit ? <PlanDialog triggerLabel="Create first plan" /> : undefined}
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Min qty</TableHead>
                  <TableHead>Valid</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead className="text-right">Subs</TableHead>
                  {canEdit && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINR(plan.price)} <span className="text-xs text-muted-foreground">{PERIOD_SUFFIX[plan.billingPeriod] ?? ""}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{titleCase(plan.billingPeriod)}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{plan.minQuantity}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(plan.startDate)} {plan.endDate ? `→ ${formatDate(plan.endDate)}` : "→ open"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {plan.autoClose && <Badge variant="outline">Auto close</Badge>}
                        {plan.closable && <Badge variant="outline">Closable</Badge>}
                        {plan.pausable && <Badge variant="outline">Pausable</Badge>}
                        {plan.renewable && <Badge variant="outline">Renewable</Badge>}
                        {!plan.autoClose && !plan.closable && !plan.pausable && !plan.renewable && (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{plan._count.subscriptions}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <PlanDialog
                            plan={{
                              id: plan.id,
                              name: plan.name,
                              price: plan.price,
                              billingPeriod: plan.billingPeriod,
                              minQuantity: plan.minQuantity,
                              startDate: toDateInput(plan.startDate),
                              endDate: plan.endDate ? toDateInput(plan.endDate) : null,
                              autoClose: plan.autoClose,
                              closable: plan.closable,
                              pausable: plan.pausable,
                              renewable: plan.renewable,
                            }}
                          />
                          <DeleteButton
                            action={deletePlanAction.bind(null, plan.id)}
                            title={`Delete "${plan.name}"?`}
                            description="Plans used by a subscription or quotation template cannot be deleted."
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
