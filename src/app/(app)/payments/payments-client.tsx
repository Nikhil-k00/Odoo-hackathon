"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import Link from "next/link";
import { Search, CreditCard, ArrowRight, DollarSign } from "lucide-react";

export interface PaymentItem {
  id: string;
  method: string;
  amount: number;
  paymentDate: string | Date;
  note: string | null;
  createdAt: string | Date;
  invoice: {
    id: string;
    number: string;
    total: number;
    customer: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface PaymentsClientProps {
  initialPayments: PaymentItem[];
}

export function PaymentsClient({ initialPayments }: PaymentsClientProps) {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");

  const filtered = initialPayments.filter((p) => {
    const matchesSearch =
      p.invoice.number.toLowerCase().includes(search.toLowerCase()) ||
      p.invoice.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.note && p.note.toLowerCase().includes(search.toLowerCase()));

    const matchesMethod = methodFilter === "ALL" || p.method === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const totalCollected = filtered.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="py-4">
            <CardDescription className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-600" /> Total Received
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {formatINR(totalCollected)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardDescription className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-primary" /> Transactions
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{filtered.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardDescription>Filtered Method</CardDescription>
            <CardTitle className="text-xl">
              <Badge variant="outline">{methodFilter}</Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Payments Ledger</CardTitle>
              <CardDescription>
                All recorded customer payments and receipts against invoices.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {["ALL", "UPI", "CARD", "BANK", "CASH"].map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={methodFilter === m ? "default" : "outline"}
                  onClick={() => setMethodFilter(m)}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice #, customer, note..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <CreditCard className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">No payments recorded</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Payments recorded against confirmed invoices will appear in this ledger.
              </p>
              <Link href="/invoices" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
                Go to Invoices
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference / Note</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-xs">
                        {formatDate(p.paymentDate)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/invoices/${p.invoice.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {p.invoice.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{p.invoice.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{p.invoice.customer.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.method}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.note || "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {formatINR(p.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/invoices/${p.invoice.id}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          View <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </TableCell>
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
