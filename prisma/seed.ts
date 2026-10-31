/**
 * Demo data for Recurra. Safe to run more than once (upserts by natural key).
 *   npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

async function upsertUser(data: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "INTERNAL" | "PORTAL";
  phone?: string;
  address?: string;
  state?: string;
  gstin?: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  const { password: _password, ...rest } = data;
  void _password;
  return prisma.user.upsert({
    where: { email: data.email },
    update: { ...rest, passwordHash },
    create: { ...rest, passwordHash },
  });
}

async function main() {
  // --- Users: demo accounts from CLAUDE.md -------------------------------
  await upsertUser({ name: "Admin", email: "admin@recurra.in", password: "Admin@1234", role: "ADMIN" });
  await upsertUser({ name: "Staff", email: "staff@recurra.in", password: "Staff@1234", role: "INTERNAL" });

  // 3 PORTAL customers: 2 in Kerala (CGST + SGST), 1 in Karnataka (IGST)
  await upsertUser({
    name: "Anjali Menon",
    email: "customer1@demo.in",
    password: "Customer@1234",
    role: "PORTAL",
    phone: "9876500001",
    address: "12 MG Road, Kochi",
    state: "Kerala",
    gstin: "32ABCDE1234F1Z5",
  });
  await upsertUser({
    name: "Rahul Nair",
    email: "customer2@demo.in",
    password: "Customer@1234",
    role: "PORTAL",
    phone: "9876500002",
    address: "45 Beach Road, Kozhikode",
    state: "Kerala",
    gstin: "32FGHIJ5678K1Z9",
  });
  await upsertUser({
    name: "Priya Shetty",
    email: "customer3@demo.in",
    password: "Customer@1234",
    role: "PORTAL",
    phone: "9876500003",
    address: "7 Brigade Road, Bengaluru",
    state: "Karnataka",
    gstin: "29KLMNO9012P1Z3",
  });

  // --- Tax ----------------------------------------------------------------
  const gst =
    (await prisma.tax.findFirst({ where: { name: "GST 18%" } })) ??
    (await prisma.tax.create({ data: { name: "GST 18%", percent: 18 } }));

  // --- Products -----------------------------------------------------------
  let erp = await prisma.product.findFirst({ where: { name: "Cloud ERP Seat" } });
  if (!erp) {
    erp = await prisma.product.create({
      data: {
        name: "Cloud ERP Seat",
        type: "SERVICE",
        salesPrice: 1500,
        costPrice: 900,
        notes: "Per-user access to the hosted ERP.",
        taxId: gst.id,
        variants: { create: [{ attribute: "Brand", value: "Odoo", extraPrice: 560 }] },
      },
    });
  }

  if (!(await prisma.product.findFirst({ where: { name: "Priority Support Pack" } }))) {
    await prisma.product.create({
      data: {
        name: "Priority Support Pack",
        type: "SERVICE",
        salesPrice: 2500,
        costPrice: 1200,
        notes: "24x7 support with 4-hour response SLA.",
        taxId: gst.id,
      },
    });
  }

  // --- Recurring plans ----------------------------------------------------
  if (!(await prisma.recurringPlan.findFirst({ where: { name: "Monthly" } }))) {
    await prisma.recurringPlan.create({
      data: {
        name: "Monthly",
        price: 999,
        billingPeriod: "MONTHLY",
        minQuantity: 1,
        startDate: daysFromNow(-365),
        autoClose: false,
        closable: true,
        pausable: true,
        renewable: true,
      },
    });
  }
  if (!(await prisma.recurringPlan.findFirst({ where: { name: "Yearly" } }))) {
    await prisma.recurringPlan.create({
      data: {
        name: "Yearly",
        price: 9999,
        billingPeriod: "YEARLY",
        minQuantity: 1,
        startDate: daysFromNow(-365),
        autoClose: true,
        closable: true,
        pausable: false,
        renewable: true,
      },
    });
  }

  // --- Discount: one active 10% off ----------------------------------------
  if (!(await prisma.discount.findFirst({ where: { name: "LAUNCH10" } }))) {
    await prisma.discount.create({
      data: {
        name: "LAUNCH10",
        type: "PERCENT",
        value: 10,
        minPurchase: 0,
        minQuantity: 1,
        startDate: daysFromNow(-30),
        endDate: daysFromNow(365),
        usageLimit: 100,
        appliesTo: "SUBSCRIPTION",
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    taxes: await prisma.tax.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    plans: await prisma.recurringPlan.count(),
    discounts: await prisma.discount.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
