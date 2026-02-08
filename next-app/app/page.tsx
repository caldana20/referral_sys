"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              Refoza Referral Platform
            </p>
            <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
              Grow your business with customer referrals.
            </h1>
            <p className="text-lg text-slate-600">
              Launch a referral program in minutes, track performance, and reward loyal customers.
              This site is the entry point for new businesses and returning admins.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild>
                <Link href="/tenant/onboarding">Get Started</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/login">Admin Login</Link>
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              Have a customer referral link? Open it directly from your email or text.
            </p>
          </div>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
              <CardDescription>Choose the path that fits you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-900">New to Refoza?</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Create your tenant, set rewards, and invite customers.
                </p>
                <Button className="mt-3" asChild>
                  <Link href="/tenant/onboarding">Start onboarding</Link>
                </Button>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-900">Already a customer?</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Log in to manage your referral program.
                </p>
                <Button variant="outline" className="mt-3" asChild>
                  <Link href="/admin/login">Go to login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Launch fast",
              body: "Spin up a branded referral program without code or custom setup.",
            },
            {
              title: "Track performance",
              body: "See referrals, estimates, and rewards in one place.",
            },
            {
              title: "Delight customers",
              body: "Automate reward delivery and keep customers engaged.",
            },
          ].map((item) => (
            <Card key={item.title} className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">{item.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-slate-500">
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
