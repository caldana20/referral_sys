import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminHomePage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Manage tenants, create client links, and bulk import users.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Referrals & Estimates</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Track referrals, estimates, and rewards in one place.
        </CardContent>
      </Card>
    </div>
  );
}

