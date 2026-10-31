import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["ADMIN", "INTERNAL"]);
  const { q } = await searchParams;
  const customers = await prisma.user.findMany({
    where: {
      role: "PORTAL",
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { gstin: { contains: q } }] } : {}),
    },
    orderBy: { name: "asc" },
    include: { _count: { select: { subscriptions: true, invoices: true } } },
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Portal users who can hold subscriptions. Customers sign up themselves at /signup.</p>
        </div>
        <form method="get" className="flex gap-2">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search name, email or GSTIN…" className="md:w-72" />
          <Button type="submit" variant="outline">Search</Button>
        </form>
      </div>
      <Card><CardContent className="overflow-x-auto p-0">
        {customers.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{q ? "No customers match this search." : "No customers yet."}</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>State</TableHead>
              <TableHead>GSTIN</TableHead><TableHead className="text-right">Subscriptions</TableHead><TableHead className="text-right">Invoices</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phone ?? "-"}</TableCell>
                  <TableCell>{c.state ? <Badge variant={c.state === "Kerala" ? "default" : "secondary"}>{c.state}</Badge> : "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{c.gstin ?? "-"}</TableCell>
                  <TableCell className="text-right">{c._count.subscriptions}</TableCell>
                  <TableCell className="text-right">{c._count.invoices}</TableCell>
                  <TableCell className="text-right"><Link href={`/subscriptions?q=${encodeURIComponent(c.name)}`} className="text-sm underline">View subscriptions</Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
