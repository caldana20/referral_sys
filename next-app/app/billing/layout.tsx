import { AuthProvider } from "@/components/providers/auth-provider";
import { BillingHeader } from "@/components/billing/billing-header";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <BillingHeader />
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </div>
    </AuthProvider>
  );
}
