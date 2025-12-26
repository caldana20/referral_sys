"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Trend = { weekStart: string; open: number; used: number; closed: number };
type TopReferrer = { userId: number; name: string; email: string; count: number };
type TopReward = { reward: string; count: number };
type Recommendation = {
  id: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

type DashboardMetrics = {
  summary: {
    totalReferrals: number;
    openCount: number;
    usedCount: number;
    closedCount: number;
    totalEstimates: number;
    conversionRate: number;
  };
  trends: Trend[];
  topReferrers: TopReferrer[];
  topRewards: TopReward[];
};

type RecommendationsResponse = {
  recommendations: Recommendation[];
};

function Bar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded bg-slate-200">
      <div className={`h-2 rounded ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export default function AdminHomePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recsError, setRecsError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<DashboardMetrics>("/api/metrics/dashboard", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setData(res);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load metrics";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [logout, router]);

  useEffect(() => {
    const loadRecs = async () => {
      try {
        const res = await apiFetch<RecommendationsResponse>("/api/metrics/recommendations", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setRecs(res?.recommendations || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load recommendations";
        setRecsError(message);
      }
    };
    loadRecs();
  }, [logout, router]);

  const maxTrend = useMemo(() => {
    if (!data?.trends?.length) return 0;
    return Math.max(
      ...data.trends.map((t) => Math.max(t.open || 0, t.used || 0, t.closed || 0))
    );
  }, [data?.trends]);

  if (loading) return <div className="p-6 text-sm text-slate-600">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!data) return null;

  const { summary, trends, topReferrers, topRewards } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Referrals</CardTitle>
            <CardDescription>All-time</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{summary.totalReferrals}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open</CardTitle>
            <CardDescription>Awaiting action</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-amber-600">{summary.openCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Used</CardTitle>
            <CardDescription>Referrals with estimates</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-green-600">{summary.usedCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Conversion</CardTitle>
            <CardDescription>Used / Total</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{summary.conversionRate}%</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Suggested next steps for this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recsError ? (
              <div className="text-sm text-red-600">{recsError}</div>
            ) : null}
            {(recs && recs.length > 0 ? recs : []).map((rec) => (
              <div key={rec.id} className="rounded border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{rec.title}</div>
                    <div className="text-xs text-slate-600">{rec.description}</div>
                  </div>
                  {rec.actionHref ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={rec.actionHref}>{rec.actionLabel || "Open"}</a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {(!recs || recs.length === 0) && !recsError ? (
              <div className="text-sm text-slate-600">No recommendations right now.</div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
          <CardTitle>Weekly Referral Trend</CardTitle>
          <CardDescription>Open vs Used vs Closed (last ~12 weeks)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {trends.length === 0 ? (
              <div className="text-sm text-slate-600">No referrals in the last 30 days.</div>
            ) : (
              trends.slice(-12).map((t) => (
                <div key={t.weekStart} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Week of {t.weekStart}</span>
                    <span className="flex gap-2">
                      <Badge variant="outline" className="text-amber-700 border-amber-200">{t.open} open</Badge>
                      <Badge variant="outline" className="text-green-700 border-green-200">{t.used} used</Badge>
                      <Badge variant="outline" className="text-slate-700 border-slate-200">{t.closed} closed</Badge>
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Bar value={t.open} max={maxTrend} color="bg-amber-400" />
                    <Bar value={t.used} max={maxTrend} color="bg-green-500" />
                    <Bar value={t.closed} max={maxTrend} color="bg-slate-500" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estimates</CardTitle>
            <CardDescription>Total estimates linked to referrals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-semibold text-blue-600">{summary.totalEstimates}</div>
            <div className="text-sm text-slate-600">
              Used referrals are those with at least one estimate.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Referrers</CardTitle>
            <CardDescription>Most referral links generated</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Referrals</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(topReferrers || []).map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-slate-600">{r.email}</div>
                    </TableCell>
                    <TableCell>{r.count}</TableCell>
                  </TableRow>
                ))}
                {(!topReferrers || topReferrers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-slate-600">
                      No referrers yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Rewards</CardTitle>
            <CardDescription>Most selected rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reward</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(topRewards || []).map((r) => (
                  <TableRow key={r.reward}>
                    <TableCell className="font-medium">{r.reward}</TableCell>
                    <TableCell>{r.count}</TableCell>
                  </TableRow>
                ))}
                {(!topRewards || topRewards.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-slate-600">
                      No reward data yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

