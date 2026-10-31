import { requireRole } from "@/lib/session";
import { CustomerForm } from "@/features/auth/components/customer-form";

export default async function NewCustomerPage() {
  await requireRole(["ADMIN", "INTERNAL"]);
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">New Customer</h1>
      <CustomerForm />
    </div>
  );
}
