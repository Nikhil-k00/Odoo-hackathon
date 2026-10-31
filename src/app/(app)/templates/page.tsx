import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteTemplateButton } from "@/features/subscriptions/components/delete-template-button";

export default async function TemplatesPage() {
  await requireRole(["ADMIN", "INTERNAL"]);
  const templates = await prisma.quotationTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: { plan: true, lines: { include: { product: true } } },
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quotation Templates</h1>
          <p className="text-sm text-muted-foreground">Reusable plan + product bundles to start a subscription from.</p>
        </div>
        <Link href="/templates/new" className={buttonVariants()}><Plus className="h-4 w-4" /> New template</Link>
      </div>

      {templates.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-muted-foreground">No templates yet.</p>
          <Link href="/templates/new" className={buttonVariants({ variant: "outline" })}>Create first template</Link>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Plan</TableHead><TableHead>Validity</TableHead>
              <TableHead>Lines</TableHead><TableHead className="text-right">List total</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {templates.map((t) => {
                const total = t.lines.reduce((s, l) => s + l.quantity * l.product.salesPrice, 0);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium"><Link href={`/templates/${t.id}`} className="hover:underline">{t.name}</Link></TableCell>
                    <TableCell><Badge variant="secondary">{t.plan.name}</Badge></TableCell>
                    <TableCell>{t.validityDays} days</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {t.lines.map((l) => `${l.quantity} × ${l.product.name}`).join(", ")}
                    </TableCell>
                    <TableCell className="text-right">{formatINR(total)}</TableCell>
                    <TableCell className="text-right"><DeleteTemplateButton id={t.id} name={t.name} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
    </div>
  );
}
