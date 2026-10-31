import { requireRole } from "@/lib/session";
import { getFormOptions } from "@/features/subscriptions/queries";
import { TemplateForm } from "@/features/subscriptions/components/template-form";

export default async function NewTemplatePage() {
  await requireRole(["ADMIN", "INTERNAL"]);
  const options = await getFormOptions();
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">New Quotation Template</h1>
      <TemplateForm options={options} />
    </div>
  );
}
