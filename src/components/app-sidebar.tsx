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
  Users,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/session";

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; roles?: Role[] };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { title: "Overview", items: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Reports", href: "/reports", icon: BarChart3 },
  ] },
  { title: "Catalog", items: [
    { label: "Products", href: "/products", icon: Package },
    { label: "Taxes", href: "/taxes", icon: Percent },
    { label: "Plans", href: "/plans", icon: CalendarClock },
    { label: "Discounts", href: "/discounts", icon: Boxes, roles: ["ADMIN"] },
  ] },
  { title: "Sales", items: [
    { label: "Customers", href: "/customers", icon: UserRound },
    { label: "Templates", href: "/templates", icon: FileText },
    { label: "Subscriptions", href: "/subscriptions", icon: Repeat },
  ] },
  { title: "Billing", items: [
    { label: "Billing Run", href: "/billing", icon: PlayCircle },
    { label: "Invoices", href: "/invoices", icon: Receipt },
    { label: "Payments", href: "/payments", icon: CreditCard },
  ] },
  { title: "Admin", items: [{ label: "Users", href: "/users", icon: Users, roles: ["ADMIN"] }] },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U";
}

/**
 * Dark icon rail (72px) that expands to show labels on hover; on mobile it becomes a top bar + drawer.
 * `expanded` forces labels on (used by the mobile drawer).
 */
export function AppSidebar({ name, role }: { name: string; role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(role)) })).filter((g) => g.items.length > 0);

  const Nav = ({ expanded }: { expanded: boolean }) => (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 py-2 [scrollbar-width:none]">
      {groups.map((group, gi) => (
        <div key={group.title} className={cn(gi > 0 && "mt-2 border-t border-white/10 pt-2")}>
          <p className={cn("px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35", expanded ? "block" : "hidden group-hover/rail:block")}>
            {group.title}
          </p>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors",
                      active ? "bg-white/15 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className={cn("whitespace-nowrap transition-opacity", expanded ? "opacity-100" : "opacity-0 group-hover/rail:opacity-100")}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const Footer = ({ expanded }: { expanded: boolean }) => (
    <div className="border-t border-white/10 p-3">
      <div className="flex h-11 items-center gap-3 px-1">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{initials(name)}</span>
        <div className={cn("min-w-0 transition-opacity", expanded ? "opacity-100" : "opacity-0 group-hover/rail:opacity-100")}>
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">{role}</p>
        </div>
      </div>
      <form action={logoutAction}>
        <button type="submit" title="Logout" className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white">
          <LogOut className="size-5 shrink-0" />
          <span className={cn("whitespace-nowrap transition-opacity", expanded ? "opacity-100" : "opacity-0 group-hover/rail:opacity-100")}>Logout</span>
        </button>
      </form>
    </div>
  );

  const Brand = ({ expanded }: { expanded: boolean }) => (
    <div className="flex h-[72px] items-center gap-3 px-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-black">
        <Repeat className="size-5" />
      </span>
      <span className={cn("font-heading text-lg font-bold text-white transition-opacity", expanded ? "opacity-100" : "opacity-0 group-hover/rail:opacity-100")}>Recurra</span>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between bg-white/90 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-black text-white"><Repeat className="size-4" /></span>
          <span className="font-heading font-bold">Recurra</span>
        </div>
        <Button variant="outline" size="icon" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="group/rail absolute inset-y-2 left-2 flex w-72 flex-col rounded-[1.5rem] bg-sidebar text-sidebar-foreground shadow-2xl">
            <div className="flex items-center justify-between pr-3">
              <Brand expanded />
              <Button variant="ghost" size="icon" aria-label="Close menu" className="text-white hover:bg-white/10" onClick={() => setOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <Nav expanded />
            <Footer expanded />
          </aside>
        </div>
      )}

      {/* Desktop rail */}
      <aside className="group/rail sticky top-3 m-3 hidden h-[calc(100vh-1.5rem)] w-[72px] shrink-0 flex-col self-start overflow-hidden rounded-[1.5rem] bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out hover:w-64 md:flex lg:top-[2.25rem] lg:h-[calc(100vh-4.5rem)]">
        <Brand expanded={false} />
        <Nav expanded={false} />
        <Footer expanded={false} />
      </aside>
    </>
  );
}
