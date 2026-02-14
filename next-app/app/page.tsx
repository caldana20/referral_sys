"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Gift,
  Link2,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Avg. referral conversion", value: "32%" },
  { label: "Program setup time", value: "< 10 min" },
  { label: "Reward payout automation", value: "100%" },
];

const features = [
  {
    title: "Launch in minutes",
    body: "Spin up a branded referral flow with flexible rewards and smart links.",
    icon: Zap,
  },
  {
    title: "Track the full journey",
    body: "Follow referrals from invite to estimate to close with clean attribution.",
    icon: BarChart3,
  },
  {
    title: "Delight customers",
    body: "Automate gifting, tiers, and follow-ups without the manual headache.",
    icon: Gift,
  },
];

const steps = [
  {
    title: "Define your offer",
    body: "Pick rewards, margins, and referral windows that protect your bottom line.",
    icon: ShieldCheck,
  },
  {
    title: "Share smart links",
    body: "Use links, QR codes, or email templates to launch fast and stay on brand.",
    icon: Link2,
  },
  {
    title: "Reward the right moments",
    body: "Trigger payouts after key milestones with automated reminders and nudges.",
    icon: Users,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -left-40 -top-24 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.25),_transparent_70%)] blur-3xl" />
          <div className="absolute right-[-140px] top-12 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.28),_transparent_70%)] blur-3xl" />
          <div className="absolute inset-0 bg-grid opacity-40" />
        </div>

        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Refoza</div>
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Referral OS</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/admin/login">Admin Login</Link>
            </Button>
            <Button asChild>
              <Link href="/tenant/onboarding">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <Badge variant="secondary" className="gap-2 px-3 py-1 text-xs uppercase tracking-[0.2em]">
              <Sparkles className="h-3.5 w-3.5" />
              Revenue-ready referral engine
            </Badge>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Turn happy customers into{" "}
              <span className="text-gradient">your highest-performing channel.</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Launch a referral program in minutes, map performance to revenue, and automate rewards
              without building custom infrastructure.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/tenant/onboarding">
                  Start onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/admin/login">Go to admin</Link>
              </Button>
            </div>
            <div className="grid gap-4 pt-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/50 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
                  <div className="text-2xl font-semibold text-slate-900">{stat.value}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card className="rounded-3xl border-white/70 bg-white/80 shadow-2xl shadow-amber-500/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Program Snapshot</CardTitle>
              <CardDescription>Today’s referrals, rewards, and momentum.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/60 bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Referrals</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">128</p>
                  <p className="text-sm text-emerald-600">+18% this week</p>
                </div>
                <div className="rounded-2xl border border-slate-200/60 bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Rewards paid</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">$4,320</p>
                  <p className="text-sm text-amber-600">On track for goal</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-white px-4 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Top advocates</span>
                  <span className="font-medium text-slate-900">24</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {["AA", "LB", "CJ", "MS", "TK"].map((initials) => (
                    <div
                      key={initials}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
                    >
                      {initials}
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground">+12 more</div>
                </div>
              </div>
              <Button className="w-full" asChild>
                <Link href="/admin/login">Open admin console</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Trusted by</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">Service brands scaling by referral.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            <span>Northline</span>
            <span>Brightdoor</span>
            <span>Stratus</span>
            <span>Everkind</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Why teams choose Refoza</p>
            <h2 className="mt-4 font-display text-3xl leading-tight text-slate-900 sm:text-4xl">
              Built for operators who want clean execution and clear ROI.
            </h2>
          </div>
          <p className="text-lg text-muted-foreground">
            Replace spreadsheets and brittle coupon codes with a referral engine that tracks every
            touchpoint and rewards the right customers automatically.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="rounded-2xl border-slate-200/60 bg-white">
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-10 shadow-sm backdrop-blur">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">How it works</p>
              <h2 className="mt-4 font-display text-3xl leading-tight text-slate-900 sm:text-4xl">
                Three steps to a program your customers love.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Design rewards, distribute links, and automate the reward moment. Everything stays
                inside your admin console so you can prove impact quickly.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/tenant/onboarding">
                    Build your program
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/admin/login">Visit admin</Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-4">
              {steps.map((step, index) => (
                <div key={step.title} className="flex gap-4 rounded-2xl border border-slate-200/60 bg-white px-4 py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Step {index + 1}
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-6">
        <div className="rounded-3xl bg-slate-900 px-10 py-12 text-white">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Ready to launch?</p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
                Create a referral program that keeps compounding.
              </h2>
              <p className="mt-4 text-lg text-slate-300">
                Give your customers an easy way to advocate and give your team the analytics to prove
                it worked.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/tenant/onboarding">Get started</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                <Link href="/admin/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Refoza. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/admin/login" className="hover:text-slate-900">
              Admin Login
            </Link>
            <Link href="/tenant/onboarding" className="hover:text-slate-900">
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
