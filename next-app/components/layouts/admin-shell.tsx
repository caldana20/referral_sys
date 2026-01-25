"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTenant } from "@/components/providers/tenant-provider";

type AdminShellProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  activePath?: string;
};

const mainItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/groups", label: "Groups" },
];

const marketingItems = [
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/products", label: "Products" },
];

const operationsItems = [
  { href: "/admin/media", label: "Media" },
  { href: "/admin/estimate-fields", label: "Estimate Fields" },
];

const businessItems = [
  { href: "/admin/billing", label: "Billing" },
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
  const isActiveGroup = (items: { href: string }[]) => items.some((item) => item.href === activePath);

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
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "rounded-md px-3 py-2 font-medium transition-colors",
                  isActiveGroup(mainItems)
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                Main
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {mainItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "rounded-md px-3 py-2 font-medium transition-colors",
                  isActiveGroup(marketingItems)
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                Marketing
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {marketingItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "rounded-md px-3 py-2 font-medium transition-colors",
                  isActiveGroup(operationsItems)
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                Operations
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {operationsItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "rounded-md px-3 py-2 font-medium transition-colors",
                  isActiveGroup(businessItems)
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                Business
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {businessItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              href="/admin/tenants/settings"
              className={cn(
                "rounded-md px-3 py-2 font-medium transition-colors",
                activePath === "/admin/tenants/settings"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              Tenant Settings
            </Link>
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

