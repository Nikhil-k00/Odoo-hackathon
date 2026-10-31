"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR, round2 } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { isIntraState } from "@/features/billing/engine";
import {
  confirmInvoiceAction,
  cancelInvoiceAction,
  sendInvoiceAction,
  recordPaymentAction,
} from "@/features/billing/actions";
import { toast } from "sonner";
import {
  Printer,
  Send,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Building,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface InvoiceDetailProps {
  invoice: {
    id: string;
    number: string;
    subscriptionId: string;
    periodStart: Date | string;
    periodEnd: Date | string;
    dueDate: Date | string;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
    amountPaid: number;
    status: string;
    createdAt: Date | string;
    customer: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      address: string | null;
      state: string | null;
      gstin: string | null;
    };
    subscription: {
      id: string;
      number: string;
    };
    lines: {
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      taxPercent: number;
      discount: number;
      amount: number;
    }[];
    payments: {
      id: string;
      method: string;
      amount: number;
      paymentDate: Date | string;
      note: string | null;
      createdAt: Date | string;
    }[];
  };
  currentUserRole: "ADMIN" | "INTERNAL" | "PORTAL";
}

export function InvoiceDetailClient({ invoice }: InvoiceDetailProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Payment form state
  const todayStr = new Date().toISOString().split("T")[0];
  const outstanding = round2(invoice.total - invoice.amountPaid);

  const [payMethod, setPayMethod] = useState<string>("UPI");
  const [payAmount, setPayAmount] = useState<string>(String(outstanding));
  const [payDate, setPayDate] = useState<string>(todayStr);
  const [payNote, setPayNote] = useState<string>("");
  const [payError, setPayError] = useState<string>("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue =
    invoice.status === "CONFIRMED" &&
    new Date(invoice.dueDate).getTime() < today.getTime() &&
    invoice.amountPaid < invoice.total;

  const isKerala = isIntraState(invoice.customer.state);
  const halfTax = round2(invoice.taxTotal / 2);
  const cgst = isKerala ? halfTax : 0;
  const sgst = isKerala ? round2(invoice.taxTotal - halfTax) : 0;
  const igst = isKerala ? 0 : invoice.taxTotal;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await confirmInvoiceAction(invoice.id);
      if (res.success) {
        toast.success(`Invoice ${invoice.number} confirmed.`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to confirm invoice");
      }
    } catch {
      toast.error("Error confirming invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm(`Are you sure you want to cancel invoice ${invoice.number}?`)) return;
    setIsSubmitting(true);
    try {
      const res = await cancelInvoiceAction(invoice.id);
      if (res.success) {
        toast.success(`Invoice ${invoice.number} cancelled.`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to cancel invoice");
      }
    } catch {
      toast.error("Error cancelling invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = async () => {
    setIsSubmitting(true);
    try {
      const res = await sendInvoiceAction(invoice.id);
      if (res.success) {
        toast.success(res.message || `Invoice ${invoice.number} marked as sent!`);
      } else {
        toast.error(res.error || "Failed to send invoice");
      }
    } catch {
      toast.error("Error sending invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError("");

    const numAmount = parseFloat(payAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setPayError("Payment amount must be greater than 0");
      return;
    }

    if (numAmount > outstanding + 0.001) {
      setPayError(`Payment cannot exceed outstanding balance (${formatINR(outstanding)})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordPaymentAction({
        invoiceId: invoice.id,
        method: payMethod,
        amount: numAmount,
        paymentDate: payDate,
        note: payNote,
      });

      if (res.success) {
        toast.success(
          res.isFullyPaid
            ? `Payment recorded! Invoice is now marked as fully PAID.`
            : `Payment of ${formatINR(numAmount)} recorded successfully.`
        );
        setPaymentDialogOpen(false);
        router.refresh();
      } else {
        setPayError(res.error || "Failed to record payment");
      }
    } catch {
      setPayError("An error occurred while recording payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Action Bar (hidden during print) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{invoice.number}</h1>
              <Badge
                variant={
                  invoice.status === "PAID"
                    ? "default"
                    : invoice.status === "CONFIRMED"
                    ? "secondary"
                    : invoice.status === "CANCELLED"
                    ? "destructive"
                    : "outline"
                }
                className={
                  invoice.status === "PAID"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : invoice.status === "CONFIRMED"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : ""
                }
              >
                {invoice.status}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="flex items-center gap-1 font-semibold animate-pulse">
                  <AlertTriangle className="h-3 w-3" /> OVERDUE
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Created on {formatDate(invoice.createdAt)} &bull; Linked Subscription:{" "}
              <Link href={`/subscriptions/${invoice.subscription.id}`} className="text-primary hover:underline">
                {invoice.subscription.number}
              </Link>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Print button */}
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" /> Print
          </Button>

          {/* Send button */}
          {invoice.status !== "CANCELLED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSend}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" /> Send
            </Button>
          )}

          {/* Confirm button */}
          {invoice.status === "DRAFT" && (
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle className="h-4 w-4" /> Confirm
            </Button>
          )}

          {/* Record Payment Dialog */}
          {invoice.status === "CONFIRMED" && outstanding > 0 && (
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CreditCard className="h-4 w-4" /> Record Payment
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handleRecordPayment}>
                  <DialogHeader>
                    <DialogTitle>Record Payment for {invoice.number}</DialogTitle>
                    <DialogDescription>
                      Outstanding balance: <span className="font-bold text-foreground">{formatINR(outstanding)}</span>
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {payError && (
                      <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                        {payError}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="method">Payment Method</Label>
                      <Select value={payMethod} onValueChange={(val) => { if (val) setPayMethod(val); }}>
                        <SelectTrigger id="method">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UPI">UPI / QR</SelectItem>
                          <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                          <SelectItem value="BANK">Bank Transfer (NEFT/RTGS)</SelectItem>
                          <SelectItem value="CASH">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={outstanding}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="date">Payment Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="note">Reference / Note (Optional)</Label>
                      <Input
                        id="note"
                        placeholder="e.g. UTR / Transaction ID"
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPaymentDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 text-white">
                      {isSubmitting ? "Saving..." : "Confirm Payment"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Cancel button */}
          {(invoice.status === "DRAFT" || invoice.status === "CONFIRMED") && invoice.payments.length === 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <XCircle className="h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* INVOICE PAPER (Clean print layout) */}
      <div className="bg-card text-card-foreground border rounded-lg shadow-sm p-8 print:p-0 print:border-none print:shadow-none space-y-8">
        {/* Company & Invoice Header */}
        <div className="flex justify-between items-start border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">Brightloop Software Pvt Ltd</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Infopark, Kochi, Kerala, India &bull; GSTIN: 32AABCB1234F1Z5
            </p>
            <p className="text-xs text-muted-foreground">contact@brightloop.in | www.brightloop.in</p>
          </div>

          <div className="text-right">
            <h3 className="text-2xl font-extrabold text-primary tracking-tight">TAX INVOICE</h3>
            <p className="text-base font-semibold mt-1">{invoice.number}</p>
            <div className="mt-2 flex justify-end">
              <Badge
                variant={invoice.status === "PAID" ? "default" : "outline"}
                className={invoice.status === "PAID" ? "bg-emerald-600 text-white" : ""}
              >
                {invoice.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Bill To & Metadata */}
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Bill To:</p>
            <p className="font-bold text-base">{invoice.customer.name}</p>
            {invoice.customer.address && <p className="text-muted-foreground">{invoice.customer.address}</p>}
            <p className="text-muted-foreground">
              {invoice.customer.state || "State Unspecified"}, India
            </p>
            <p className="text-xs text-muted-foreground">Email: {invoice.customer.email}</p>
            {invoice.customer.phone && <p className="text-xs text-muted-foreground">Phone: {invoice.customer.phone}</p>}
            {invoice.customer.gstin && (
              <p className="text-xs font-mono font-medium mt-1">GSTIN: {invoice.customer.gstin}</p>
            )}
          </div>

          <div className="space-y-2 text-right">
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wider block">Billing Period</span>
              <span className="font-medium">
                {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wider block">Invoice Date</span>
              <span className="font-medium">{formatDate(invoice.createdAt)}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wider block">Due Date</span>
              <span className="font-medium text-destructive">{formatDate(invoice.dueDate)}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wider block">Place of Supply</span>
              <span className="font-medium">
                {invoice.customer.state || "Kerala"} ({isKerala ? "Intra-State: CGST + SGST" : "Inter-State: IGST"})
              </span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Tax Rate</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines.map((line, idx) => (
                <TableRow key={line.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{line.description}</TableCell>
                  <TableCell className="text-center">{line.quantity}</TableCell>
                  <TableCell className="text-right">{formatINR(line.unitPrice)}</TableCell>
                  <TableCell className="text-right text-xs">{line.taxPercent}%</TableCell>
                  <TableCell className="text-right text-emerald-600 text-xs">
                    {line.discount > 0 ? `-${formatINR(line.discount)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatINR(line.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totals & Tax Split Calculation */}
        <div className="flex justify-end pt-2">
          <div className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatINR(invoice.subtotal)}</span>
            </div>

            {invoice.discountTotal > 0 && (
              <div className="flex justify-between py-1 border-b text-emerald-600">
                <span>Discount:</span>
                <span className="font-medium">-{formatINR(invoice.discountTotal)}</span>
              </div>
            )}

            {/* GST Breakdown */}
            {isKerala ? (
              <>
                <div className="flex justify-between py-1 text-xs text-muted-foreground">
                  <span>CGST (Central Tax):</span>
                  <span>{formatINR(cgst)}</span>
                </div>
                <div className="flex justify-between py-1 text-xs text-muted-foreground border-b pb-2">
                  <span>SGST (State Tax - Kerala):</span>
                  <span>{formatINR(sgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-1 text-xs text-muted-foreground border-b pb-2">
                <span>IGST (Integrated Tax):</span>
                <span>{formatINR(igst)}</span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Total Taxes:</span>
              <span className="font-medium">{formatINR(invoice.taxTotal)}</span>
            </div>

            <div className="flex justify-between py-2 border-b text-base font-bold">
              <span>Invoice Total:</span>
              <span className="text-primary">{formatINR(invoice.total)}</span>
            </div>

            <div className="flex justify-between py-1 text-emerald-600">
              <span>Amount Paid:</span>
              <span className="font-medium">{formatINR(invoice.amountPaid)}</span>
            </div>

            <div className="flex justify-between py-2 bg-muted/40 px-3 rounded-md font-bold text-base">
              <span>Outstanding Balance:</span>
              <span className={outstanding > 0 ? "text-amber-800" : "text-emerald-700"}>
                {formatINR(outstanding)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History (if any) */}
        {invoice.payments.length > 0 && (
          <div className="border-t pt-6 print:hidden">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Payment Transactions ({invoice.payments.length})
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference / Note</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.paymentDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.method}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{p.note || "—"}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {formatINR(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Footer Notes for Print */}
        <div className="border-t pt-6 text-xs text-muted-foreground text-center space-y-1">
          <p>Thank you for choosing Brightloop Software!</p>
          <p>This is a computer-generated tax invoice. Double-billing protection strictly verified.</p>
        </div>
      </div>
    </div>
  );
}
