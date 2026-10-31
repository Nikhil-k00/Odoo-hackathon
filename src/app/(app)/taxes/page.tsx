import { Percent } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteTaxAction } from "@/features/catalog/actions/taxes";
import { DeleteButton } from "@/features/catalog/components/delete-button";
import { EmptyState } from "@/features/catalog/components/empty-state";
import { PageHeader } from "@/features/catalog/components/page-header";
import { TaxDialog } from "@/features/catalog/components/tax-dialog";

export default async function TaxesPage() {
  const session = await requireRole(["ADMIN", "INTERNAL"]);
  const canEdit = session.role === "ADMIN";

  const taxes = await prisma.tax.findMany({
    orderBy: [{ percent: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title="Taxes"
        description={canEdit ? "Tax rates applied to products and copied to subscription lines." : "View only. Ask an admin to change tax rates."}
        actions={canEdit ? <TaxDialog /> : undefined}
      />

      {taxes.length === 0 ? (
        <EmptyState
          icon={<Percent />}
          title="No taxes yet"
          description="Create GST 18% to get the demo catalog going."
          action={canEdit ? <TaxDialog triggerLabel="Create first tax" /> : undefined}
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead>Created</TableHead>
                  {canEdit && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxes.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-medium">{tax.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{tax.percent}%</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{tax._count.products}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(tax.createdAt)}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <TaxDialog tax={{ id: tax.id, name: tax.name, percent: tax.percent }} />
                          <DeleteButton
                            action={deleteTaxAction.bind(null, tax.id)}
                            title={`Delete "${tax.name}"?`}
                            description="This cannot be undone. Taxes used by a product or subscription line cannot be deleted."
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
