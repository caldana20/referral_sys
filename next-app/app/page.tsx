import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div>
          <p className="text-sm font-semibold text-slate-600">Referral System</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Next.js + Tailwind + shadcn/ui</h1>
          <p className="mt-2 text-base text-slate-600">
            Choose a workspace to explore the rebuilt UI. The legacy Vite app remains intact.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Onboarding</CardTitle>
              <CardDescription>Multi-step tenant creation and preview/confirm flow.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Includes company info, admin account, settings, and confirmation.
              </div>
              <Button asChild>
                <Link href="/tenant/onboarding">Open</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin Area</CardTitle>
              <CardDescription>Clients, referrals, rewards, invitations.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Protected views mirroring the current admin app.</div>
              <Button asChild variant="outline">
                <Link href="/admin">Open</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
