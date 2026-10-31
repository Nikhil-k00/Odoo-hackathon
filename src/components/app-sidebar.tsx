"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Boxes,
  CalendarClock,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Percent,
  PlayCircle,
  Receipt,
  Repeat,
  ShieldCheck,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/session";

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; roles?: Role[] };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Taxes", href: "/taxes", icon: Percent },
      { label: "Plans", href: "/plans", icon: CalendarClock },
      { label: "Discounts", href: "/discounts", icon: Boxes, roles: ["ADMIN"] },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Customers", href: "/customers", icon: UserRound },
      { label: "Templates", href: "/templates", icon: FileText },
      { label: "Subscriptions", href: "/subscriptions", icon: Repeat },
    ],
  },
  {
    title: "Billing",
    items: [
      { label: "Billing Run", href: "/billing", icon: PlayCircle },
      { label: "Invoices", href: "/invoices", icon: Receipt },
      { label: "Payments", href: "/payments", icon: CreditCard },
    ],
  },
  {
    title: "Admin",
    items: [{ label: "Users", href: "/users", icon: Users, roles: ["ADMIN"] }],
  },
];

export function AppSidebar({ name, role }: { name: string; role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);

  const nav = (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t p-3">
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <Badge variant={role === "ADMIN" ? "default" : "secondary"} className="mt-1">
            {role}
          </Badge>
        </div>
        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="outline" size="sm" className="w-full">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </form>
    </div>
  );

  const brand = (
    <div className="flex h-14 items-center gap-2 border-b px-4">
      <Repeat className="h-5 w-5 text-primary" />
      <span className="text-lg font-semibold tracking-tight">Recurra</span>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-primary" />
          <span className="font-semibold">Recurra</span>
        </div>
        <Button variant="ghost" size="icon" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-background shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <span className="text-lg font-semibold">Recurra</span>
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background md:flex">
        {brand}
        {nav}
        {footer}
      </aside>
    </>
  );
}
