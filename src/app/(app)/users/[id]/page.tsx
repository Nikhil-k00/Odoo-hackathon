import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditUserForm } from "./edit-user-form";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      state: true,
      gstin: true,
      createdAt: true,
    },
  });
  if (!user) notFound();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{user.name}</h1>
        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{user.role}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditUserForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}