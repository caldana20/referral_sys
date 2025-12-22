"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

type Estimate = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  description?: string;
  customFields?: Record<string, unknown>;
  createdAt?: string;
};

export default function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { logout } = useAuth();

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await apiFetch<{ estimate: Estimate }>(`/api/estimates/${id}`, {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setEstimate(res?.estimate || null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load estimate";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, logout, router]);

  const renderCustomFields = () => {
    if (!estimate?.customFields) return null;
    const entries = Object.entries(estimate.customFields);
    if (!entries.length) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-800">Custom Fields</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key} className="rounded border bg-slate-50 px-3 py-2 text-sm">
              <div className="text-xs uppercase text-slate-500">{key}</div>
              <div className="text-slate-800">{String(value ?? "")}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimate {estimate?.id || id}</CardTitle>
        <CardDescription>Details for this estimate request.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <div className="text-sm text-slate-600">Loading…</div>}
        {error && !loading && <div className="text-sm text-red-600">{error}</div>}
        {estimate && !loading && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase text-slate-500">Name</div>
                <div className="text-sm text-slate-800">{estimate.name || "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">Email</div>
                <div className="text-sm text-slate-800">{estimate.email || "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">Phone</div>
                <div className="text-sm text-slate-800">{estimate.phone || "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">Created</div>
                <div className="text-sm text-slate-800">
                  {estimate.createdAt ? new Date(estimate.createdAt).toLocaleString() : "—"}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase text-slate-500">Address</div>
              <div className="text-sm text-slate-800">
                {[estimate.address, estimate.city].filter(Boolean).join(", ") || "—"}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase text-slate-500">Description</div>
              <div className="rounded border bg-slate-50 px-3 py-2 text-sm text-slate-800">
                {estimate.description || "—"}
              </div>
            </div>

            {renderCustomFields()}

            {estimate.id ? (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Badge variant="outline">ID: {estimate.id}</Badge>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

