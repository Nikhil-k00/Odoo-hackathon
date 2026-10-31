import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatINR, round2 } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteProductAction, removeVariantAction } from "@/features/catalog/actions/products";
import { DeleteButton } from "@/features/catalog/components/delete-button";
import { ProductDialog } from "@/features/catalog/components/product-dialog";
import { VariantForm } from "@/features/catalog/components/variant-form";
import { titleCase } from "@/features/catalog/format";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(["ADMIN", "INTERNAL"]);
  const canEdit = session.role === "ADMIN";
  const { id } = await params;

  const [product, taxes] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        tax: true,
        variants: { orderBy: [{ attribute: "asc" }, { value: "asc" }] },
        _count: { select: { subscriptionLines: true, templateLines: true } },
      },
    }),
    canEdit ? prisma.tax.findMany({ orderBy: { percent: "asc" } }) : Promise.resolve([]),
  ]);
  if (!product) notFound();

  const taxOptions = taxes.map((t) => ({ value: t.id, label: `${t.name} (${t.percent}%)` }));
  const usedBy = product._count.subscriptionLines + product._count.templateLines;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/products" />}>
          <ArrowLeft /> All products
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{product.name}</h1>
            <Badge variant="outline">{titleCase(product.type)}</Badge>
            <Badge variant={product.active ? "default" : "secondary"}>{product.active ? "Active" : "Inactive"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Created {formatDate(product.createdAt)}
            {usedBy > 0 && ` · used on ${product._count.subscriptionLines} subscription line(s) and ${product._count.templateLines} template line(s)`}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <ProductDialog
              taxes={taxOptions}
              product={{
                id: product.id,
                name: product.name,
                type: product.type,
                salesPrice: product.salesPrice,
                costPrice: product.costPrice,
                notes: product.notes,
                taxId: product.taxId,
                active: product.active,
              }}
            />
            <DeleteButton
              size="sm"
              action={deleteProductAction.bind(null, product.id)}
              title={`Delete "${product.name}"?`}
              description="Variants are removed with it. Products used by a subscription or template cannot be deleted."
              redirectTo="/products"
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Sales price</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{formatINR(product.salesPrice)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Cost price</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{formatINR(product.costPrice)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tax</CardDescription>
            <CardTitle className="text-2xl">
              {product.tax ? (
                <span className="flex items-center gap-2">
                  {product.tax.percent}% <Badge variant="secondary">{product.tax.name}</Badge>
                </span>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {product.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{product.notes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="size-4" /> Variants
          </CardTitle>
          <CardDescription>
            Each variant adds its extra price to the sales price. Final price = sales price + extra price.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canEdit && <VariantForm productId={product.id} />}

          {product.variants.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No variants yet{canEdit ? ". Add one above, e.g. Brand / Odoo / 560." : "."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attribute</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="text-right">Extra price</TableHead>
                    <TableHead className="text-right">Final price</TableHead>
                    {canEdit && <TableHead className="w-16 text-right">Remove</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variants.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.attribute}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{v.value}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {v.extraPrice >= 0 ? "+" : ""}
                        {formatINR(v.extraPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatINR(round2(product.salesPrice + v.extraPrice))}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <DeleteButton
                            action={removeVariantAction.bind(null, v.id)}
                            label="Remove"
                            title={`Remove ${v.attribute} / ${v.value}?`}
                            description="Variants used by a subscription line cannot be removed."
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
