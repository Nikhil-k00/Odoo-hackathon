import { prisma } from "@/lib/db";
import { addPeriod } from "@/lib/dates";

/**
 * Local dev seed for M5 testing.
 * Seeds ACTIVE subscriptions with lines, taxes, and discounts so Billing Run can be verified
 * independently before M4 finishes.
 * Do NOT edit prisma/seed.ts - this script is run via:
 *   npx tsx src/features/billing/dev-seed.ts
 */
export async function seedBillingDevData() {
  console.log("Seeding billing dev data...");

  // Find customers: Kerala customer and Karnataka customer
  const keralaCustomer = await prisma.user.findFirst({
    where: { state: "Kerala", role: "PORTAL" },
  });
  const nonKeralaCustomer = await prisma.user.findFirst({
    where: { state: { not: "Kerala" }, role: "PORTAL" },
  });

  if (!keralaCustomer || !nonKeralaCustomer) {
    console.warn("Required customers not found in DB. Make sure prisma/seed.ts was executed.");
    return;
  }

  // Find plans
  const monthlyPlan = await prisma.recurringPlan.findFirst({
    where: { billingPeriod: "MONTHLY" },
  });
  const yearlyPlan = await prisma.recurringPlan.findFirst({
    where: { billingPeriod: "YEARLY" },
  });

  if (!monthlyPlan) {
    console.warn("Monthly plan not found in DB.");
    return;
  }

  // Find products and tax
  const products = await prisma.product.findMany({
    include: { variants: true, tax: true },
  });

  if (products.length === 0) {
    console.warn("No products found in DB.");
    return;
  }

  const discount = await prisma.discount.findFirst({
    where: { appliesTo: "SUBSCRIPTION" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneMonthAgo = addPeriod(today, "MONTHLY");
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 2); // 2 months ago

  // 1. Subscription for Kerala customer (Intra-state GST -> CGST + SGST)
  const sub1 = await prisma.subscription.upsert({
    where: { number: "SUB-DEV-0001" },
    update: {
      status: "ACTIVE",
      nextBillingDate: oneMonthAgo,
    },
    create: {
      number: "SUB-DEV-0001",
      customerId: keralaCustomer.id,
      planId: monthlyPlan.id,
      startDate: oneMonthAgo,
      nextBillingDate: oneMonthAgo,
      status: "ACTIVE",
      discountId: discount?.id ?? null,
      lines: {
        create: [
          {
            productId: products[0].id,
            variantId: products[0].variants[0]?.id ?? null,
            taxId: products[0].taxId,
            quantity: 2,
            unitPrice: products[0].salesPrice + (products[0].variants[0]?.extraPrice ?? 0),
            amount: 2 * (products[0].salesPrice + (products[0].variants[0]?.extraPrice ?? 0)),
          },
        ],
      },
    },
  });

  // 2. Subscription for Karnataka customer (Inter-state GST -> IGST)
  const sub2 = await prisma.subscription.upsert({
    where: { number: "SUB-DEV-0002" },
    update: {
      status: "ACTIVE",
      nextBillingDate: today,
    },
    create: {
      number: "SUB-DEV-0002",
      customerId: nonKeralaCustomer.id,
      planId: (yearlyPlan ?? monthlyPlan).id,
      startDate: today,
      nextBillingDate: today,
      status: "ACTIVE",
      lines: {
        create: [
          {
            productId: products[products.length - 1].id,
            taxId: products[products.length - 1].taxId,
            quantity: 1,
            unitPrice: products[products.length - 1].salesPrice,
            amount: products[products.length - 1].salesPrice,
          },
        ],
      },
    },
  });

  console.log("Seeded test subscriptions:", sub1.number, sub2.number);
}

// Allow direct execution
if (process.argv[1]?.includes("dev-seed.ts")) {
  seedBillingDevData()
    .then(() => {
      console.log("Dev seed completed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error in dev seed:", err);
      process.exit(1);
    });
}

