"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { BILLING_HOST, isBrowser } from "@/lib/config";

type TenantOption = {
  tenantId: number;
  name: string;
  slug: string;
  baseUrl: string;
};

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [tenantSlug, setTenantSlug] = useState("");

  const isBillingHost = isBrowser && BILLING_HOST && window.location.hostname === BILLING_HOST;

  useEffect(() => {
    const prefillEmail = searchParams.get("email");
    if (prefillEmail) {
      setEmail(prefillEmail);
      setShowPasswordForm(true);
    }
  }, [searchParams]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupLoading(true);
    try {
      const res = await apiFetch<{ tenants: TenantOption[] }>("/api/auth/tenant-options", {
        method: "POST",
        body: { email },
      });
      const tenants = Array.isArray(res?.tenants) ? res.tenants : [];

      if (tenants.length === 0) {
        toast.error("No admin account found for that email.");
        return;
      }

      if (tenants.length === 1) {
        if (isBillingHost) {
          setTenantSlug(tenants[0].slug);
          setShowPasswordForm(true);
        } else {
          const target = `${tenants[0].baseUrl}/admin/login?email=${encodeURIComponent(email)}`;
          if (typeof window !== "undefined" && window.location.origin === tenants[0].baseUrl) {
            setShowPasswordForm(true);
          } else {
            window.location.href = target;
          }
        }
        return;
      }

      setTenantOptions(tenants);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Tenant lookup failed";
      toast.error(message);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password, tenantSlug });
      toast.success("Logged in");
      router.push(isBillingHost ? "/billing" : "/admin");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Start with your email to find your tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          {!showPasswordForm ? (
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@example.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={lookupLoading}>
                {lookupLoading ? "Checking..." : "Continue"}
              </Button>
              {tenantOptions.length > 1 ? (
                <div className="space-y-2 text-sm text-slate-600">
                  <p>Select your tenant:</p>
                  <div className="space-y-2">
                    {tenantOptions.map((tenant) => (
                      <Button
                        key={tenant.tenantId}
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          if (isBillingHost) {
                            setTenantSlug(tenant.slug);
                            setShowPasswordForm(true);
                          } else {
                            const target = `${tenant.baseUrl}/admin/login?email=${encodeURIComponent(email)}`;
                            window.location.href = target;
                          }
                        }}
                      >
                        <span className="font-medium text-slate-900">{tenant.name}</span>
                        <span className="ml-2 text-xs text-slate-500">{tenant.baseUrl}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <button
                  type="button"
                  className="text-slate-900 underline"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPassword("");
                    setTenantOptions([]);
                    setTenantSlug("");
                  }}
                >
                  Find my tenant
                </button>
                <Link href="/admin/forgot-password" className="text-slate-900 underline">
                  Forgot your password?
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600">Loading…</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}

