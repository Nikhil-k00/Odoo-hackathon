"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR, round2 } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import Link from "next/link";
import { Search, FileText, ArrowRight, AlertTriangle } from "lucide-react";

export interface InvoiceItem {
  id: string;
  number: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  dueDate: string | Date;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  status: string;
  createdAt: string | Date;
  customer: {
    id: string;
    name: string;
    state: string | null;
  };
  subscription: {
    id: string;
    number: string;
  };
}

interface InvoicesClientProps {
  initialInvoices: InvoiceItem[];
}

export function InvoicesClient({ initialInvoices }: InvoicesClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = initialInvoices.filter((inv) => {
    const matchesSearch =
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      inv.subscription.number.toLowerCase().includes(search.toLowerCase());

    const isOverdue =
      inv.status === "CONFIRMED" &&
      new Date(inv.dueDate).getTime() < today.getTime() &&
      inv.amountPaid < inv.total;

    if (statusFilter === "ALL") return matchesSearch;
    if (statusFilter === "OVERDUE") return matchesSearch && isOverdue;
    return matchesSearch && inv.status === statusFilter;
  });

  const getStatusBadge = (inv: InvoiceItem) => {
    const isOverdue =
      inv.status === "CONFIRMED" &&
      new Date(inv.dueDate).getTime() < today.getTime() &&
      inv.amountPaid < inv.total;

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant={
            inv.status === "PAID"
              ? "default"
              : inv.status === "CONFIRMED"
              ? "secondary"
              : inv.status === "CANCELLED"
              ? "destructive"
              : "outline"
          }
          className={
            inv.status === "PAID"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : inv.status === "CONFIRMED"
              ? "bg-blue-100 text-blue-800 border-blue-200"
              : ""
          }
        >
          {inv.status}
        </Badge>
        {isOverdue && (
          <Badge variant="destructive" className="flex items-center gap-1 font-semibold animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            OVERDUE
          </Badge>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Invoices Directory</CardTitle>
            <CardDescription>
              Browse and manage customer invoices, track payments, view GST splits, and inspect overdue items.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["ALL", "CONFIRMED", "PAID", "DRAFT", "CANCELLED", "OVERDUE"].map((st) => (
              <Button
                key={st}
                size="sm"
                variant={statusFilter === st ? "default" : "outline"}
                onClick={() => setStatusFilter(st)}
              >
                {st === "OVERDUE" ? "⚠️ Overdue" : st}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice #, customer, sub #..."
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
            <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium">No invoices found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search || statusFilter !== "ALL"
                ? "Try adjusting your search or status filter."
                : "Run a billing cycle from the Billing page to generate invoices."}
            </p>
            <Link href="/billing" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
              Go to Billing Run
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => {
                  const outstanding = round2(inv.total - inv.amountPaid);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-semibold text-primary">
                        <Link href={`/invoices/${inv.id}`} className="hover:underline">
                          {inv.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{inv.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{inv.customer.state || "India"}</div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/subscriptions/${inv.subscription.id}`}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {inv.subscription.number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{formatDate(inv.dueDate)}</TableCell>
                      <TableCell className="text-right font-medium">{formatINR(inv.total)}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">
                        {formatINR(inv.amountPaid)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-amber-700">
                        {formatINR(outstanding)}
                      </TableCell>
                      <TableCell>{getStatusBadge(inv)}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className={buttonVariants({ variant: "ghost", size: "sm", className: "flex items-center gap-1" })}
                        >
                          View <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
