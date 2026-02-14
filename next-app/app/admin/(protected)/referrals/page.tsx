"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, CircleCheck, CircleDot, Inbox } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Referral = {
  id: number;
  code: string;
  status: string;
  createdAt: string;
  prospectName?: string;
  prospectEmail?: string;
  User?: { name: string; email: string };
  Estimates?: Array<{ id: number; name?: string; email?: string; createdAt?: string }>;
  Campaign?: { id: number; name: string };
};

export default function AdminReferralsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"All" | "Open" | "Closed">("All");
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({});
  const [query, setQuery] = useState("");

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
    const byStatus = filterStatus === "All" ? referrals : referrals.filter((r) => r.status === filterStatus);
    if (!query.trim()) return byStatus;
    const q = query.toLowerCase();
    return byStatus.filter((r) => {
      const clientName = r.User?.name?.toLowerCase() || "";
      const clientEmail = r.User?.email?.toLowerCase() || "";
      const prospectName = r.Estimates?.[0]?.name?.toLowerCase() || r.prospectName?.toLowerCase() || "";
      const prospectEmail = r.Estimates?.[0]?.email?.toLowerCase() || r.prospectEmail?.toLowerCase() || "";
      return (
        clientName.includes(q) ||
        clientEmail.includes(q) ||
        prospectName.includes(q) ||
        prospectEmail.includes(q)
      );
    });
  }, [referrals, filterStatus, query]);

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
  const summary = useMemo(() => {
    const total = referrals.length;
    const open = referrals.filter((r) => r.status === "Open").length;
    const closed = referrals.filter((r) => r.status === "Closed").length;
    const withEstimates = referrals.filter((r) => (r.Estimates || []).length > 0).length;
    return { total, open, closed, withEstimates };
  }, [referrals]);
  const summaryCards = [
    { label: "Total referrals", value: summary.total, icon: Inbox },
    { label: "Open", value: summary.open, icon: CircleDot },
    { label: "Closed", value: summary.closed, icon: CircleCheck },
    { label: "With estimates", value: summary.withEstimates, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Badge variant="secondary" className="mb-3 px-3 py-1 text-xs uppercase tracking-[0.25em]">
              Referral inbox
            </Badge>
            <h1 className="font-display text-3xl text-slate-900">Referrals</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Track every referral link, prospect, and estimate from a single operational view.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDelete} disabled={loading}>
              Delete Selected
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.label} className="rounded-2xl border-slate-200/70 bg-white">
              <CardContent className="flex items-center justify-between gap-3 pt-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <card.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="rounded-3xl border-slate-200/70 bg-white">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Referral Activity</CardTitle>
            <CardDescription>View referral links and associated estimates.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by client/prospect name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-[260px]"
            />
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
                <TableHead>Campaign</TableHead>
                <TableHead>Prospect</TableHead>
                <TableHead>Status</TableHead>
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
                    <div className="text-xs text-muted-foreground">{referral.User?.email}</div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-700">
                    {referral.Campaign?.name ? (
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        {referral.Campaign.name}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {referral.Estimates?.[0]?.name || referral.prospectName || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {referral.Estimates?.[0]?.email || referral.prospectEmail || ""}
                    </div>
                    {referral.Estimates?.[0]?.id ? (
                      <div className="text-[11px]">
                        <Link
                          href={`/admin/estimates/${referral.Estimates[0].id}`}
                          className="text-primary underline"
                        >
                          Estimate #{referral.Estimates[0].id}
                        </Link>
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-slate-200 text-slate-700",
                        referral.status === "Open" && "border-amber-200 text-amber-700 bg-amber-50/70",
                        referral.status === "Closed" && "border-emerald-200 text-emerald-700 bg-emerald-50/70"
                      )}
                    >
                      {referral.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(referral.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {referral.status !== "Closed" ? (
                      <Button size="sm" variant="outline" onClick={() => handleClose(referral.id)}>
                        Close
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    {loading ? "Loading referrals..." : "No referrals found."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
