import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { CustomerForm } from "@/features/auth/components/customer-form";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "INTERNAL"]);
  const { id } = await params;
  const c = await prisma.user.findFirst({ where: { id, role: "PORTAL" } });
  if (!c) notFound();
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit Customer</h1>
      <CustomerForm customerId={c.id} initial={{ name: c.name, email: c.email, phone: c.phone ?? "", address: c.address ?? "", state: c.state ?? "", gstin: c.gstin ?? "" }} />
    </div>
  );
}
