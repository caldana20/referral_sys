"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

type Tenant = {
  id: number;
  name: string;
  slug: string;
  clientUrl: string;
  subscriptionStatus?: string | null;
  isActive: boolean;
  deactivatedAt?: string | null;
  deletedAt?: string | null;
  createdAt?: string | null;
  adminCount?: number;
};

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailInfo, setDetailInfo] = useState<Record<string, unknown> | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const load = async (nextPage = page) => {
    setLoading(true);
    try {
      const res = await apiFetch<{
        tenants: Tenant[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      }>(`/api/super-admin/tenants?page=${nextPage}&pageSize=${pageSize}`);
      setTenants(res?.tenants || []);
      setPage(res?.page || nextPage);
      setTotalPages(res?.totalPages || 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load tenants";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const updateStatus = async (tenantId: number, isActive: boolean) => {
    try {
      await apiFetch(`/api/super-admin/tenants/${tenantId}/status`, {
        method: "PATCH",
        body: { isActive },
      });
      toast.success(isActive ? "Tenant activated" : "Tenant deactivated");
      load(page);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Update failed";
      toast.error(message);
    }
  };

  const softDelete = async (tenantId: number) => {
    if (!confirm("Mark this tenant as deleted? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/super-admin/tenants/${tenantId}`, { method: "DELETE" });
      toast.success("Tenant marked as deleted");
      load(page);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    }
  };

  const openDetails = async (tenantId: number) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await apiFetch<{ tenant: Record<string, unknown> }>(`/api/super-admin/tenants/${tenantId}`);
      setDetailInfo(res?.tenant || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load tenant details";
      toast.error(message);
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const renderDetailRow = (label: string, value?: unknown) => {
    if (value == null || value === "") return null;
    const display =
      typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value, null, 2);
    return (
      <div className="grid gap-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-sm text-slate-800 whitespace-pre-wrap break-words">{display}</div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenants</CardTitle>
        <CardDescription>Monitor onboarding, status, and access.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-slate-600">Loading tenants…</p>
        ) : (
          <div className="space-y-3">
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{tenant.name}</span>
                    {tenant.deletedAt ? (
                      <Badge variant="destructive">Deleted</Badge>
                    ) : tenant.isActive ? (
                      <Badge className="bg-emerald-600 text-white">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Deactivated</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{tenant.clientUrl}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span>Slug: {tenant.slug}</span>
                    <span>Admins: {tenant.adminCount ?? 0}</span>
                    <span>Status: {tenant.subscriptionStatus || "n/a"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => openDetails(tenant.id)}>
                    View details
                  </Button>
                  {tenant.deletedAt ? null : tenant.isActive ? (
                    <Button variant="outline" onClick={() => updateStatus(tenant.id, false)}>
                      Deactivate
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => updateStatus(tenant.id, true)}>
                      Activate
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => softDelete(tenant.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {tenants.length === 0 ? <p className="text-sm text-slate-600">No tenants found.</p> : null}
            <div className="flex items-center justify-between pt-2 text-sm text-slate-600">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-slate-600">Loading…</p>
          ) : detailInfo ? (
            <div className="grid gap-4">
              {renderDetailRow("Name", detailInfo.name)}
              {renderDetailRow("Email", detailInfo.email)}
              {renderDetailRow("Phone", detailInfo.phone)}
              {renderDetailRow("Address", detailInfo.address)}
              {renderDetailRow("City", detailInfo.city)}
              {renderDetailRow("State", detailInfo.state)}
              {renderDetailRow("Zip", detailInfo.zip)}
              {renderDetailRow("Country", detailInfo.country)}
              {renderDetailRow("Slug", detailInfo.slug)}
              {renderDetailRow("Client URL", detailInfo.clientUrl)}
              {renderDetailRow("SendGrid From", detailInfo.sendgridFromEmail)}
              {renderDetailRow("Subscription Status", detailInfo.subscriptionStatus)}
              {renderDetailRow("Current Period End", detailInfo.subscriptionCurrentPeriodEnd)}
              {renderDetailRow("Stripe Customer ID", detailInfo.stripeCustomerId)}
              {renderDetailRow("Stripe Subscription ID", detailInfo.stripeSubscriptionId)}
              {renderDetailRow("Stripe Price ID", detailInfo.stripePriceId)}
              {renderDetailRow("Active", detailInfo.isActive)}
              {renderDetailRow("Deactivated At", detailInfo.deactivatedAt)}
              {renderDetailRow("Deleted At", detailInfo.deletedAt)}
              {renderDetailRow("Created At", detailInfo.createdAt)}
              {renderDetailRow("Estimate Field Config", detailInfo.estimateFieldConfig)}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No details found.</p>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
