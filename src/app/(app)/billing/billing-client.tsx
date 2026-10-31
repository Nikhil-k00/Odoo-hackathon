"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { previewBillingAction, commitBillingAction } from "@/features/billing/actions";
import { BillingRunResult } from "@/features/billing/engine";
import { toast } from "sonner";
import { Play, Eye, Calendar, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface BillingClientProps {
  userRole: "ADMIN" | "INTERNAL" | "PORTAL";
}

export function BillingClient({ userRole }: BillingClientProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [asOfDate, setAsOfDate] = useState<string>(todayStr);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<"DRY" | "COMMIT" | null>(null);
  const [result, setResult] = useState<BillingRunResult | null>(null);

  const isAdmin = userRole === "ADMIN";

  const handlePreview = async () => {
    setIsLoading(true);
    setActiveMode("DRY");
    try {
      const res = await previewBillingAction(asOfDate);
      if (res.success && res.data) {
        setResult(res.data);
        toast.info(
          `Dry run complete: ${res.data.invoicesCreated} invoices ready, ${res.data.skipped.length} skipped.`
        );
      } else {
        toast.error(res.error || "Failed to preview billing run");
      }
    } catch {
      toast.error("Error generating preview");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!isAdmin) {
      toast.error("Only ADMIN can execute a billing run commit");
      return;
    }

    setIsLoading(true);
    setActiveMode("COMMIT");
    try {
      const res = await commitBillingAction(asOfDate);
      if (res.success && res.data) {
        setResult(res.data);
        if (res.data.invoicesCreated > 0) {
          toast.success(
            `Successfully created ${res.data.invoicesCreated} invoices totaling ${formatINR(res.data.totalAmount)}!`
          );
        } else {
          toast.warning("Billing run completed: 0 new invoices created (all skipped / already billed).");
        }
      } else {
        toast.error(res.error || "Failed to execute billing run");
      }
    } catch {
      toast.error("Error executing billing run");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Billing Run (Time Machine)
          </CardTitle>
          <CardDescription>
            Preview upcoming subscriptions ready for invoicing or execute billing as of a specific date.
            Double billing is strictly prevented by unique constraints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="w-full sm:w-64 space-y-2">
              <Label htmlFor="asOfDate">Bill as of Date</Label>
              <Input
                id="asOfDate"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={isLoading || !asOfDate}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                {isLoading && activeMode === "DRY" ? "Simulating..." : "Preview (Dry Run)"}
              </Button>
              <Button
                onClick={handleCommit}
                disabled={isLoading || !asOfDate || !isAdmin}
                className="gap-2 bg-primary text-primary-foreground"
              >
                <Play className="h-4 w-4" />
                {isLoading && activeMode === "COMMIT" ? "Processing..." : "Run Billing (Commit)"}
              </Button>
            </div>
          </div>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 text-amber-600">
              <ShieldAlert className="h-3.5 w-3.5" />
              Note: Internal users can preview billing calculations. Only Admin users can commit invoices.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {result && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="py-4">
              <CardDescription>Mode</CardDescription>
              <CardTitle className="text-xl">
                <Badge variant={result.mode === "COMMIT" ? "default" : "secondary"}>
                  {result.mode === "COMMIT" ? "COMMITTED" : "PREVIEW (DRY)"}
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardDescription>Invoices {result.mode === "COMMIT" ? "Created" : "To Bill"}</CardDescription>
              <CardTitle className="text-2xl font-bold">{result.invoicesCreated}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardDescription>Total Invoiced Value</CardDescription>
              <CardTitle className="text-2xl font-bold text-primary">
                {formatINR(result.totalAmount)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardDescription>Skipped (Not Due / Billed)</CardDescription>
              <CardTitle className="text-2xl font-bold text-muted-foreground">
                {result.skipped.length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Results Table: Invoices */}
      {result && result.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              {result.mode === "COMMIT" ? "Generated Invoices" : "Invoices to be Created"}
            </CardTitle>
            <CardDescription>
              All line calculations include GST split (CGST+SGST for Kerala, IGST for outside Kerala) and applicable discounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">GST Split</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.invoices.map((inv, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/subscriptions/${inv.subscriptionId}`}
                          className="hover:underline text-primary"
                        >
                          {inv.subscriptionNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inv.customerName}</p>
                          <p className="text-xs text-muted-foreground">{inv.customerState}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                      </TableCell>
                      <TableCell className="text-right">{formatINR(inv.subtotal)}</TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {inv.discountTotal > 0 ? `-${formatINR(inv.discountTotal)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {inv.igstTotal > 0 ? (
                          <span>IGST: {formatINR(inv.igstTotal)}</span>
                        ) : (
                          <span>
                            CGST: {formatINR(inv.cgstTotal)} <br />
                            SGST: {formatINR(inv.sgstTotal)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatINR(inv.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {result.mode === "COMMIT" ? "CONFIRMED" : "READY"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {result.mode === "COMMIT" && (
              <div className="mt-4 flex justify-end">
                <Link href="/invoices" className={buttonVariants({ variant: "outline" })}>
                  View All Invoices
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Skipped Subscriptions */}
      {result && result.skipped.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Skipped Subscriptions ({result.skipped.length})
            </CardTitle>
            <CardDescription>
              These active subscriptions were evaluated but skipped. Double-billing protection prevents repeat invoicing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason Skipped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.skipped.map((skip, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{skip.subscriptionNumber}</TableCell>
                      <TableCell>{skip.customerName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm flex items-center gap-2">
                        <Badge variant="secondary" className="font-normal">
                          {skip.reason}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
