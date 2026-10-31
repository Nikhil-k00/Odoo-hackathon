import { requireRole } from "@/lib/session";
import { getFormOptions } from "@/features/subscriptions/queries";
import { SubscriptionForm } from "@/features/subscriptions/components/subscription-form";

export default async function NewSubscriptionPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  await requireRole(["ADMIN", "INTERNAL"]);
  const [{ template }, options] = await Promise.all([searchParams, getFormOptions()]);
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">New Subscription</h1>
      <SubscriptionForm options={options} initialTemplateId={template} />
    </div>
  );
}
