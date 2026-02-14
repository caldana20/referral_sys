"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTenant } from "@/components/providers/tenant-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { BILLING_HOST, isBrowser } from "@/lib/config";

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
  { href: "/admin/email-templates", label: "Email Templates" },
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
  const { user } = useAuth();
  const displayTenant = tenantName || tenantSlug || "Tenant";
  const displayUser = user?.name || user?.email || "Account";
  const isActiveGroup = (items: { href: string }[]) => items.some((item) => item.href === activePath);
  const billingHref =
    isBrowser && BILLING_HOST
      ? `${window.location.protocol}//${BILLING_HOST}/billing`
      : "/admin/billing";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">Referral Admin</div>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-700">
            <span className="hidden sm:inline rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
              {displayTenant}
            </span>
            <Separator orientation="vertical" className="h-6" />
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full px-3 py-1 text-sm font-medium text-slate-700 hover:text-slate-900">
                {displayUser}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/admin/account/password">Change Password</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/logout">Logout</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav className="border-t border-slate-200/70 bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3 text-sm">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "rounded-full px-4 py-2 font-medium transition-colors",
                  isActiveGroup(mainItems)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-700 hover:bg-primary/10 hover:text-slate-900"
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
                  "rounded-full px-4 py-2 font-medium transition-colors",
                  isActiveGroup(marketingItems)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-700 hover:bg-primary/10 hover:text-slate-900"
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
                  "rounded-full px-4 py-2 font-medium transition-colors",
                  isActiveGroup(operationsItems)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-700 hover:bg-primary/10 hover:text-slate-900"
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
                  "rounded-full px-4 py-2 font-medium transition-colors",
                  isActiveGroup(businessItems)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-700 hover:bg-primary/10 hover:text-slate-900"
                )}
              >
                Business
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {businessItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.label === "Billing" ? billingHref : item.href}>
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              href="/admin/tenants/settings"
              className={cn(
                "rounded-full px-4 py-2 font-medium transition-colors",
                activePath === "/admin/tenants/settings"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-700 hover:bg-primary/10 hover:text-slate-900"
              )}
            >
              Tenant Settings
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        {title ? <h1 className="font-display text-3xl text-slate-900">{title}</h1> : null}
        {title ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
        <div className={cn(title ? "mt-6" : "")}>{children}</div>
      </main>
    </div>
  );
}
