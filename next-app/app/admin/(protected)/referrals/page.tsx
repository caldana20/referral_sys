 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

type Referral = {
  id: number;
  code: string;
  status: string;
  createdAt: string;
  prospectName?: string;
  prospectEmail?: string;
  User?: { name: string; email: string };
  Estimates?: Array<{ id: number; name?: string; email?: string; createdAt?: string }>;
};

export default function AdminReferralsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"All" | "Open" | "Closed">("All");
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Referral[]>("/api/referrals", {
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setReferrals(Array.isArray(res) ? res : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load referrals";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [logout, router]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filterStatus === "All") return referrals;
    return referrals.filter((r) => r.status === filterStatus);
  }, [referrals, filterStatus]);

  const toggleSelect = (id: number, checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => ({ ...prev, [id]: checked === "indeterminate" ? false : Boolean(checked) }));
  };

  const allSelected = filtered.length > 0 && filtered.every((r) => selectedIds[r.id]);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    const next: Record<number, boolean> = { ...selectedIds };
    filtered.forEach((r) => {
      next[r.id] = checked === "indeterminate" ? false : Boolean(checked);
    });
    setSelectedIds(next);
  };

  const handleClose = async (id: number) => {
    try {
      await apiFetch(`/api/referrals/${id}/status`, {
        method: "PATCH",
        body: { status: "Closed" },
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Closed" } : r)));
      toast.success("Referral closed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      toast.error(message);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Object.entries(selectedIds)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    if (ids.length === 0) {
      toast.message("Select at least one referral");
      return;
    }
    try {
      await apiFetch("/api/referrals/bulk-delete", {
        method: "POST",
        body: { ids },
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setReferrals((prev) => prev.filter((r) => !ids.includes(r.id)));
      setSelectedIds({});
      toast.success("Referrals deleted");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete referrals";
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Referrals</CardTitle>
          <CardDescription>View referral links and associated estimates.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterStatus} onValueChange={(v: "All" | "Open" | "Closed") => setFilterStatus(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleBulkDelete} disabled={loading}>
            Delete Selected
          </Button>
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
              </TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Prospect</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Estimates</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((referral) => (
              <TableRow key={referral.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds[referral.id] || false}
                    onCheckedChange={(c) => toggleSelect(referral.id, c)}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{referral.code}</TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{referral.User?.name || "—"}</div>
                  <div className="text-xs text-slate-600">{referral.User?.email}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {referral.Estimates?.[0]?.name || referral.prospectName || "—"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {referral.Estimates?.[0]?.email || referral.prospectEmail || ""}
                  </div>
                  {referral.Estimates?.[0]?.id ? (
                    <div className="text-[11px]">
                      <Link
                        href={`/admin/estimates/${referral.Estimates[0].id}`}
                        className="text-blue-700 underline"
                      >
                        Estimate #{referral.Estimates[0].id}
                      </Link>
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant={referral.status === "Closed" ? "outline" : "secondary"}>{referral.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{referral.Estimates?.length || 0}</div>
                  {referral.Estimates?.[0]?.createdAt ? (
                    <div className="text-[11px] text-slate-500">
                      {new Date(referral.Estimates[0].createdAt).toLocaleString()}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs text-slate-600">
                  {new Date(referral.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {referral.status !== "Closed" ? (
                    <Button size="sm" variant="outline" onClick={() => handleClose(referral.id)}>
                      Close
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-slate-600">
                  {loading ? "Loading referrals..." : "No referrals found."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

