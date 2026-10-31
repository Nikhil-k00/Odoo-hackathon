import { Boxes } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteDiscountAction } from "@/features/catalog/actions/discounts";
import { DeleteButton } from "@/features/catalog/components/delete-button";
import { DiscountDialog } from "@/features/catalog/components/discount-dialog";
import { EmptyState } from "@/features/catalog/components/empty-state";
import { PageHeader } from "@/features/catalog/components/page-header";
import { discountStatus, type DiscountStatus } from "@/features/catalog/discount-status";
import { toDateInput } from "@/features/catalog/format";

const STATUS_BADGE: Record<DiscountStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  ACTIVE: { label: "Active", variant: "default" },
  SCHEDULED: { label: "Scheduled", variant: "outline" },
  EXPIRED: { label: "Expired", variant: "secondary" },
  EXHAUSTED: { label: "Exhausted", variant: "destructive" },
};

export default async function DiscountsPage() {
  // ADMIN only: INTERNAL users are redirected to their home by requireRole.
  await requireRole(["ADMIN"]);

  const [discounts, products] = await Promise.all([
    prisma.discount.findMany({
      orderBy: [{ endDate: "desc" }, { name: "asc" }],
      include: { products: { include: { product: { select: { id: true, name: true } } } }, _count: { select: { subscriptions: true } } },
    }),
    prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const productOptions = products.map((p) => ({ value: p.id, label: p.name }));
  const now = new Date();

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title="Discounts"
        description="Applied automatically by the billing run while active and within usage limits. Admin only."
        actions={<DiscountDialog products={productOptions} />}
      />

      {discounts.length === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title="No discounts yet"
          description="Create a 10% launch discount to see it applied on invoices."
          action={<DiscountDialog products={productOptions} triggerLabel="Create first discount" />}
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Applies to</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((d) => {
                  const status = STATUS_BADGE[discountStatus(d, now)];
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {d.type === "PERCENT" ? `${d.value}%` : formatINR(d.value)}{" "}
                        <Badge variant="outline">{d.type === "PERCENT" ? "Percent" : "Fixed"}</Badge>
                      </TableCell>
                      <TableCell>
                        {d.appliesTo === "PRODUCT" ? (
                          <div className="flex max-w-56 flex-wrap gap-1">
                            {d.products.length === 0 ? (
                              <span className="text-xs text-muted-foreground">No products</span>
                            ) : (
                              d.products.map((dp) => (
                                <Badge key={dp.productId} variant="secondary">
                                  {dp.product.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary">Subscription</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        Min {formatINR(d.minPurchase)} · qty ≥ {d.minQuantity}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(d.startDate)} → {formatDate(d.endDate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {d.usedCount} / {d.usageLimit ?? "∞"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <DiscountDialog
                            products={productOptions}
                            discount={{
                              id: d.id,
                              name: d.name,
                              type: d.type,
                              value: d.value,
                              minPurchase: d.minPurchase,
                              minQuantity: d.minQuantity,
                              startDate: toDateInput(d.startDate),
                              endDate: toDateInput(d.endDate),
                              usageLimit: d.usageLimit,
                              appliesTo: d.appliesTo,
                              productIds: d.products.map((dp) => dp.productId),
                            }}
                          />
                          <DeleteButton
                            action={deleteDiscountAction.bind(null, d.id)}
                            title={`Delete "${d.name}"?`}
                            description={`Used ${d.usedCount} time(s). Discounts attached to a subscription cannot be deleted.`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
