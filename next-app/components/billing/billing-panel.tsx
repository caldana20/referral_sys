"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";

type TenantSettings = {
  id: number;
  name: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: string | null;
};

export function BillingPanel() {
  const { logout } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<TenantSettings>("/api/tenants/settings", {
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setSettings(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load billing status";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startCheckout = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ url: string }>("/api/billing/checkout", {
        method: "POST",
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start checkout";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ url: string }>("/api/billing/portal", {
        method: "POST",
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to open billing portal";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const status = settings?.subscriptionStatus || "none";
  const renewal =
    settings?.subscriptionCurrentPeriodEnd &&
    new Date(settings.subscriptionCurrentPeriodEnd).toLocaleString();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing & Subscription</CardTitle>
          <CardDescription>Manage your subscription and billing details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-slate-600">Loading billing status…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-sm text-slate-700">
                  Status:{" "}
                  <Badge variant={status === "active" ? "default" : "outline"}>
                    {status}
                  </Badge>
                </div>
                {renewal ? (
                  <div className="text-sm text-slate-700">Renews/ends: {renewal}</div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={startCheckout} disabled={busy}>
                  {busy ? "Please wait…" : "Start Subscription"}
                </Button>
                <Button variant="secondary" onClick={openPortal} disabled={busy}>
                  {busy ? "Please wait…" : "Open Billing Portal"}
                </Button>
              </div>

              <p className="text-xs text-slate-500">
                Checkout uses Stripe’s hosted payment page. The billing portal lets you update
                payment methods, view invoices, or cancel/renew without contacting support.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
