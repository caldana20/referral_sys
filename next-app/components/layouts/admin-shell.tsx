"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useTenant } from "@/components/providers/tenant-provider";

type AdminShellProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  activePath?: string;
};

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/tenants/settings", label: "Tenant Settings" },
  { href: "/admin/estimate-fields", label: "Estimate Fields" },
  { href: "/admin/admins", label: "Admins" },
];

export function AdminShell({
  children,
  title,
  description,
  activePath = "",
}: AdminShellProps) {
  const { tenantName, tenantSlug } = useTenant();
  const displayTenant = tenantName || tenantSlug || "Tenant";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">Referral Admin</div>
            {description ? (
              <p className="text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-700">
            <span className="hidden sm:inline rounded-full bg-slate-900 px-3 py-1 text-white">
              {displayTenant}
            </span>
            <Separator orientation="vertical" className="h-6" />
            <Link href="/admin/logout" className="hover:text-slate-900">
              Logout
            </Link>
          </div>
        </div>
        <nav className="border-t bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-2 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 font-medium transition-colors",
                  activePath === item.href
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        {title ? <h1 className="text-2xl font-semibold text-slate-900">{title}</h1> : null}
        {title ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        <div className={cn(title ? "mt-6" : "")}>{children}</div>
      </main>
    </div>
  );
}

