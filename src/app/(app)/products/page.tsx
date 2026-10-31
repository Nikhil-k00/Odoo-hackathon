import Link from "next/link";
import { Package } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/features/catalog/components/empty-state";
import { PageHeader } from "@/features/catalog/components/page-header";
import { ProductDialog } from "@/features/catalog/components/product-dialog";
import { SearchForm } from "@/features/catalog/components/search-form";
import { titleCase } from "@/features/catalog/format";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireRole(["ADMIN", "INTERNAL"]);
  const canEdit = session.role === "ADMIN";
  const q = (await searchParams).q?.trim() ?? "";

  const [products, taxes] = await Promise.all([
    prisma.product.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { notes: { contains: q } }] } : undefined,
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { tax: true, _count: { select: { variants: true } } },
    }),
    canEdit ? prisma.tax.findMany({ orderBy: { percent: "asc" } }) : Promise.resolve([]),
  ]);
  const taxOptions = taxes.map((t) => ({ value: t.id, label: `${t.name} (${t.percent}%)` }));

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title="Products"
        description="Services and goods sold on subscriptions. Variants add to the sales price."
        actions={canEdit ? <ProductDialog taxes={taxOptions} /> : undefined}
      />

      <SearchForm action="/products" defaultValue={q} placeholder="Search products by name or notes" />

      {products.length === 0 ? (
        q ? (
          <EmptyState
            icon={<Package />}
            title={`No products match "${q}"`}
            description="Try a different search term."
            action={
              <Button variant="outline" render={<Link href="/products" />}>
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Package />}
            title="No products yet"
            description="Create your first product, then add variants on its detail page."
            action={canEdit ? <ProductDialog taxes={taxOptions} triggerLabel="Create first product" /> : undefined}
          />
        )
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Sales price</TableHead>
                  <TableHead className="text-right">Cost price</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead className="text-right">Variants</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{titleCase(p.type)}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(p.salesPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatINR(p.costPrice)}</TableCell>
                    <TableCell>{p.tax ? `${p.tax.name}` : <span className="text-muted-foreground">None</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{p._count.variants}</TableCell>
                    <TableCell>
                      <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
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
