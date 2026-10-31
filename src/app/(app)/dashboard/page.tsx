import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  Package,
  PlayCircle,
  Receipt,
  Repeat,
  Settings2,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatINR, round2 } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PillChart, type MonthPoint } from "@/components/dashboard/pill-chart";
import { PromoArt } from "@/components/dashboard/promo-art";

function monthly(price: number, period: string): number {
  switch (period) {
    case "DAILY": return price * 30;
    case "WEEKLY": return (price * 52) / 12;
    case "YEARLY": return price / 12;
    default: return price;
  }
}

const TABS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Subscriptions", href: "/subscriptions" },
  { label: "Invoices", href: "/invoices" },
  { label: "Payments", href: "/payments" },
  { label: "Customers", href: "/customers" },
  { label: "Plans", href: "/plans" },
  { label: "Reports", href: "/reports" },
];

const LINKS = [
  { href: "/subscriptions", icon: Repeat, title: "Subscriptions", text: "Draft to Active with a full audit timeline." },
  { href: "/invoices", icon: Receipt, title: "Invoices", text: "GST split, overdue flags, send and print." },
  { href: "/payments", icon: CreditCard, title: "Payments", text: "Record UPI, card, bank or cash against invoices." },
  { href: "/reports", icon: BarChart3, title: "Reports", text: "Revenue, outstanding and MRR with filters." },
];

export default async function DashboardPage() {
  const session = await requireRole(["ADMIN", "INTERNAL"]);
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 7, 1);

  const [activeSubs, totalSubs, payments, invoicedAgg, confirmed, overdueRows, mrrSubs, recentInvoices, invoicesForChart, paymentsForChart] = await Promise.all([
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count(),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { status: { not: "CANCELLED" } }, _sum: { total: true } }),
    prisma.invoice.aggregate({ where: { status: "CONFIRMED" }, _sum: { total: true, amountPaid: true } }),
    prisma.invoice.findMany({ where: { status: "CONFIRMED", dueDate: { lt: now } }, select: { total: true, amountPaid: true } }),
    prisma.subscription.findMany({ where: { status: "ACTIVE" }, select: { plan: { select: { price: true, billingPeriod: true } }, lines: { select: { quantity: true } } } }),
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { customer: { select: { name: true } } } }),
    prisma.invoice.findMany({ where: { status: { not: "CANCELLED" }, periodStart: { gte: since } }, select: { periodStart: true, total: true } }),
    prisma.payment.findMany({ where: { paymentDate: { gte: since } }, select: { paymentDate: true, amount: true } }),
  ]);

  const revenue = payments._sum.amount ?? 0;
  const invoiced = invoicedAgg._sum.total ?? 0;
  const outstanding = (confirmed._sum.total ?? 0) - (confirmed._sum.amountPaid ?? 0);
  const overdue = overdueRows.filter((i) => i.amountPaid < i.total);
  const overdueAmount = overdue.reduce((s, i) => s + i.total - i.amountPaid, 0);
  const mrr = mrrSubs.reduce((s, sub) => s + monthly(sub.plan.price, sub.plan.billingPeriod) * (sub.lines.reduce((q, l) => q + l.quantity, 0) || 1), 0);

  const months: MonthPoint[] = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 7 + i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const inv = invoicesForChart.filter((x) => `${x.periodStart.getFullYear()}-${x.periodStart.getMonth()}` === key).reduce((s, x) => s + x.total, 0);
    const col = paymentsForChart.filter((x) => `${x.paymentDate.getFullYear()}-${x.paymentDate.getMonth()}` === key).reduce((s, x) => s + x.amount, 0);
    return { label: d.toLocaleString("en-IN", { month: "short" }), invoiced: round2(inv), collected: round2(col) };
  });

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={<>Billing that <span className="inline-flex size-9 items-center justify-center rounded-full bg-card align-middle sm:size-10"><Repeat className="size-4" /></span> runs itself</>}
        highlight="for Brightloop"
        icon={<Sparkles />}
        description={`Welcome back, ${session.name}. Live numbers as of ${formatDate(now)}.`}
        actions={
          <>
            <Link href={session.role === "ADMIN" ? "/users" : "/taxes"} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Settings">
              <Settings2 />
            </Link>
            <Link href="/billing" className={buttonVariants({ size: "lg" })}>
              <PlayCircle /> Run Billing
            </Link>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <nav className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} className={t.href === "/dashboard" ? "inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground" : "inline-flex h-10 items-center rounded-full bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-neutral-200/70"}>
                {t.label}
              </Link>
            ))}
          </nav>

          <div className="grid gap-4 md:grid-cols-3">
            <StatTile icon={<Repeat />} label="Active subscriptions" value={String(activeSubs)} pill={totalSubs ? `${Math.round((activeSubs / totalSubs) * 100)}%` : "0%"} sub={`/ ${totalSubs} total`} ratio={totalSubs ? activeSubs / totalSubs : 0} />
            <StatTile tone="accent" icon={<Wallet />} label="Revenue collected" value={formatINR(revenue)} pill={invoiced ? `${Math.round((revenue / invoiced) * 100)}%` : "0%"} sub={`of ${formatINR(invoiced)} invoiced`} ratio={invoiced ? revenue / invoiced : 0} />
            <div className="relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[1.25rem] bg-[#141414] p-5 text-white">
              <PromoArt className="pointer-events-none absolute -right-10 -top-6 size-56 opacity-90" />
              <p className="relative max-w-[60%] font-heading text-xl font-semibold leading-snug">Bill as of any date. Never twice.</p>
              <div className="relative flex flex-col gap-3">
                <p className="max-w-[60%] text-xs text-white/60">Preview, commit, repeat. The database refuses a second invoice for the same period.</p>
                <Link href="/billing" className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-neutral-200">
                  Open billing run <PlayCircle className="size-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-[1.25rem] bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-white"><BarChart3 className="size-4" /></span>
                <h2 className="font-heading text-xl font-semibold">Statistics</h2>
                <span className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-foreground" /> Invoiced</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-accent ring-1 ring-black/10" /> Collected</span>
              </div>
              <span className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-medium">Last 8 months</span>
            </div>
            <div className="mt-4"><PillChart data={months} /></div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatTile icon={<BarChart3 />} label="MRR" value={formatINR(round2(mrr))} sub="monthly-normalised" />
            <StatTile icon={<Receipt />} label="Outstanding" value={formatINR(round2(outstanding))} sub="confirmed, unpaid" />
            <StatTile icon={<CreditCard />} label="Overdue invoices" value={String(overdue.length)} pill={overdue.length ? formatINR(round2(overdueAmount)) : undefined} sub={overdue.length ? "past due" : "nothing past due"} />
          </div>

          <div className="rounded-[1.25rem] bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold">Recent invoices</h2>
              <Link href="/invoices" className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">All invoices <ArrowUpRight className="size-4" /></Link>
            </div>
            {recentInvoices.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No invoices yet. Activate a subscription and run billing.</p>
            ) : (
              <ul className="mt-3 divide-y divide-black/5">
                {recentInvoices.map((inv) => {
                  const isOverdue = inv.status === "CONFIRMED" && inv.dueDate < now && inv.amountPaid < inv.total;
                  return (
                    <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-white"><Receipt className="size-4" /></span>
                        <div>
                          <Link href={`/invoices/${inv.id}`} className="font-semibold hover:underline">{inv.number}</Link>
                          <p className="text-xs text-muted-foreground">{inv.customer.name} · due {formatDate(inv.dueDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                        <Badge variant={inv.status === "PAID" ? "accent" : inv.status === "CANCELLED" ? "destructive" : "secondary"}>{inv.status}</Badge>
                        <span className="w-28 text-right font-semibold tabular-nums">{formatINR(inv.total)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            {[{ href: "/customers", icon: UserRound, label: "Customers" }, { href: "/products", icon: Package, label: "Products" }].map((l) => (
              <Link key={l.href} href={l.href} className="flex flex-col items-center gap-3 rounded-[1.25rem] bg-card p-5 text-sm font-semibold transition-colors hover:bg-neutral-200/60">
                <span className="flex size-10 items-center justify-center rounded-full bg-white"><l.icon className="size-4" /></span>
                {l.label}
              </Link>
            ))}
          </div>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="group flex flex-col gap-3 rounded-[1.25rem] bg-card p-5 transition-colors hover:bg-neutral-200/60">
              <div className="flex items-start justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white"><l.icon className="size-4" /></span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{l.title}</p>
                <p className="text-xs text-muted-foreground">{l.text}</p>
              </div>
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}
