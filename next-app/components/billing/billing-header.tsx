"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { BILLING_HOST, isBrowser, TENANT_HOST_BASE } from "@/lib/config";

export function BillingHeader() {
  const { user } = useAuth();
  const tenantSlug = user?.tenantSlug;

  const tenantUrl = useMemo(() => {
    if (!isBrowser || !tenantSlug || !TENANT_HOST_BASE) return null;
    const protocol = window.location.protocol || "https:";
    return `${protocol}//${tenantSlug}.${TENANT_HOST_BASE}`;
  }, [tenantSlug]);

  return (
    <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
      <div className="text-lg font-semibold text-slate-900">Billing</div>
      <nav className="flex items-center gap-2 text-sm text-slate-700">
        <Link
          href="/billing"
          className="rounded-md bg-slate-900 px-3 py-2 font-medium text-white"
        >
          Billing & Subscription
        </Link>
        {tenantUrl ? (
          <a
            href={`${tenantUrl}/admin`}
            className="rounded-md border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Tenant
          </a>
        ) : null}
      </nav>
    </div>
  );
}
