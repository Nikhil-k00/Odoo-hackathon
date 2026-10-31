import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getFormOptions } from "@/features/subscriptions/queries";
import { TemplateForm } from "@/features/subscriptions/components/template-form";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "INTERNAL"]);
  const { id } = await params;
  const [template, options] = await Promise.all([
    prisma.quotationTemplate.findUnique({ where: { id }, include: { lines: true } }),
    getFormOptions(),
  ]);
  if (!template) notFound();
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Edit Template</h1>
      <TemplateForm
        options={options}
        templateId={template.id}
        initial={{
          name: template.name,
          validityDays: template.validityDays,
          planId: template.planId,
          lines: template.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        }}
      />
    </div>
  );
}
