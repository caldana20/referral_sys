"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgePercent, CircleCheck, CircleDot, Sparkles, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

type TenantSettings = {
  subscriptionStatus?: string | null;
  billingBypass?: boolean;
};

function Bar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${width}%` }} />
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
  const [settings, setSettings] = useState<TenantSettings | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [metricsRes, settingsRes] = await Promise.all([
          apiFetch<DashboardMetrics>("/api/metrics/dashboard", {
            onUnauthorized: () => {
              logout();
              router.replace("/admin/login");
            },
          }),
          apiFetch<TenantSettings>("/api/tenants/settings", {
            onUnauthorized: () => {
              logout();
              router.replace("/admin/login");
            },
          }),
        ]);
        setData(metricsRes);
        setSettings(settingsRes);
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
  const subStatus = settings?.subscriptionStatus || "none";
  const bypass = settings?.billingBypass === true;
  const atLimit = !bypass && subStatus !== "active" && (summary?.totalReferrals ?? 0) >= 5;
  const statCards = [
    {
      title: "Total Referrals",
      description: "All-time",
      value: summary.totalReferrals,
      icon: Users,
      valueClassName: "text-slate-900",
    },
    {
      title: "Open",
      description: "Awaiting action",
      value: summary.openCount,
      icon: CircleDot,
      valueClassName: "text-amber-600",
    },
    {
      title: "Used",
      description: "With estimates",
      value: summary.usedCount,
      icon: CircleCheck,
      valueClassName: "text-emerald-600",
    },
    {
      title: "Conversion",
      description: "Used / Total",
      value: `${summary.conversionRate}%`,
      icon: BadgePercent,
      valueClassName: "text-slate-900",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <Badge variant="secondary" className="gap-2 px-3 py-1 text-xs uppercase tracking-[0.25em]">
              <Sparkles className="h-3.5 w-3.5" />
              Live dashboard
            </Badge>
            <h1 className="font-display text-3xl text-slate-900 sm:text-4xl">
              Referral performance at a glance
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Track momentum, conversions, and the next best actions for your program from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/admin/clients">
                View clients
                <TrendingUp className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/referrals">Open referrals</Link>
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.title} className="rounded-2xl border-slate-200/70 bg-white">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <CardDescription className="text-xs">{card.description}</CardDescription>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <card.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className={`text-3xl font-semibold ${card.valueClassName}`}>
                {card.value}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {atLimit && (
        <Alert className="border-amber-200/70 bg-amber-50/80">
          <AlertTitle className="text-amber-900">Free limit reached</AlertTitle>
          <AlertDescription className="text-amber-800">
            You’ve created 5 referrals on the free tier. Subscribe to create more referral links.{" "}
            <Link href="/admin/billing" className="font-semibold underline">
              Go to Billing
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border-slate-200/70 bg-white">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Suggested next steps for this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recsError ? (
              <div className="text-sm text-red-600">{recsError}</div>
            ) : null}
            {(recs && recs.length > 0 ? recs : []).map((rec) => (
              <div key={rec.id} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{rec.title}</div>
                    <div className="text-xs text-muted-foreground">{rec.description}</div>
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
              <div className="text-sm text-muted-foreground">No recommendations right now.</div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200/70 bg-white">
          <CardHeader>
            <CardTitle>Weekly Referral Trend</CardTitle>
            <CardDescription>Open vs Used vs Closed (last ~12 weeks)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {trends.length === 0 ? (
              <div className="text-sm text-muted-foreground">No referrals in the last 30 days.</div>
            ) : (
              trends.slice(-12).map((t) => (
                <div key={t.weekStart} className="space-y-2">
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                    <span>Week of {t.weekStart}</span>
                    <span className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-amber-200 text-amber-700">
                        {t.open} open
                      </Badge>
                      <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                        {t.used} used
                      </Badge>
                      <Badge variant="outline" className="border-slate-200 text-slate-700">
                        {t.closed} closed
                      </Badge>
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Bar value={t.open} max={maxTrend} color="bg-amber-400" />
                    <Bar value={t.used} max={maxTrend} color="bg-emerald-500" />
                    <Bar value={t.closed} max={maxTrend} color="bg-slate-500" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-3xl border-slate-200/70 bg-white">
          <CardHeader>
            <CardTitle>Estimates</CardTitle>
            <CardDescription>Total estimates linked to referrals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-semibold text-primary">{summary.totalEstimates}</div>
            <div className="text-sm text-muted-foreground">
              Used referrals are those with at least one estimate.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200/70 bg-white">
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
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell>{r.count}</TableCell>
                  </TableRow>
                ))}
                {(!topReferrers || topReferrers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                      No referrers yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200/70 bg-white">
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
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
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
