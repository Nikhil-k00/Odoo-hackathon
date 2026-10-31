import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getFormOptions } from "@/features/subscriptions/queries";
import { canEditLines } from "@/features/subscriptions/status";
import { SubscriptionForm } from "@/features/subscriptions/components/subscription-form";

export default async function EditSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "INTERNAL"]);
  const { id } = await params;
  const [sub, options] = await Promise.all([
    prisma.subscription.findUnique({ where: { id }, include: { lines: true } }),
    getFormOptions(),
  ]);
  if (!sub) notFound();
  if (!canEditLines(sub.status)) redirect(`/subscriptions/${id}`);
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Edit {sub.number}</h1>
      <SubscriptionForm
        options={options}
        subscriptionId={sub.id}
        initial={{
          customerId: sub.customerId,
          planId: sub.planId,
          startDate: sub.startDate.toISOString(),
          expirationDate: sub.expirationDate?.toISOString() ?? null,
          paymentTerms: sub.paymentTerms,
          discountId: sub.discountId,
          lines: sub.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, taxId: l.taxId, quantity: l.quantity, unitPrice: l.unitPrice })),
        }}
      />
    </div>
  );
}
