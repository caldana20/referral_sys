"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type TenantContextValue = {
  tenantId: number | null;
  tenantSlug: string | null;
  tenantName: string | null;
  logoUrl: string | null;
  loading: boolean;
  error: string | null;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantContextValue>({
    tenantId: null,
    tenantSlug: null,
    tenantName: null,
    logoUrl: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await apiFetch<{ id: number; slug: string; name: string; logoUrl: string | null }>(
          "/api/meta/tenant",
          { cache: "no-store" }
        );
        if (!mounted) return;
        setTenant({
          tenantId: res.id,
          tenantSlug: res.slug,
          tenantName: res.name,
          logoUrl: res.logoUrl || null,
          loading: false,
          error: null,
        });
      } catch (err: unknown) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Failed to resolve tenant";
        setTenant((prev) => ({ ...prev, loading: false, error: message }));
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}

