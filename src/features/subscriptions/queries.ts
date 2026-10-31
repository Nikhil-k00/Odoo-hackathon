import { prisma } from "@/lib/db";

/** Everything the subscription / template forms need to render selects. */
export async function getFormOptions() {
  const [customers, plans, products, discounts, templates] = await Promise.all([
    prisma.user.findMany({ where: { role: "PORTAL" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
    prisma.recurringPlan.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true, billingPeriod: true, minQuantity: true, pausable: true, closable: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        salesPrice: true,
        taxId: true,
        tax: { select: { id: true, name: true, percent: true } },
        variants: { select: { id: true, attribute: true, value: true, extraPrice: true } },
      },
    }),
    prisma.discount.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, type: true, value: true } }),
    prisma.quotationTemplate.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, planId: true, validityDays: true, lines: { select: { productId: true, quantity: true } } },
    }),
  ]);
  const taxes = await prisma.tax.findMany({ orderBy: { percent: "asc" }, select: { id: true, name: true, percent: true } });
  return { customers, plans, products, discounts, templates, taxes };
}
export type FormOptions = Awaited<ReturnType<typeof getFormOptions>>;

/** Generates SUB-0001, SUB-0002, ... based on the highest existing number. */
export async function nextSubscriptionNumber(tx: { subscription: { findFirst: typeof prisma.subscription.findFirst } }) {
  const last = await tx.subscription.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  const n = last ? parseInt(last.number.replace(/\D/g, ""), 10) + 1 : 1;
  return `SUB-${String(n).padStart(4, "0")}`;
}

export function getSubscriptionDetail(id: string) {
  return prisma.subscription.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, state: true, gstin: true } },
      plan: true,
      discount: { select: { id: true, name: true, type: true, value: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true } },
          variant: { select: { id: true, attribute: true, value: true } },
          tax: { select: { id: true, name: true, percent: true } },
        },
      },
      invoices: { orderBy: { periodStart: "desc" } },
      logs: { orderBy: { createdAt: "asc" } },
    },
  });
}
export type SubscriptionDetail = NonNullable<Awaited<ReturnType<typeof getSubscriptionDetail>>>;
