"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, isAuthenticated } from "@/components/providers/auth-provider";

export default function SuperAdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (!isAuthenticated()) {
      router.replace("/sa/login");
      return;
    }
    if (user && user.role !== "super_admin") {
      logout();
      router.replace("/sa/login");
    }
  }, [router, user, logout]);

  if (!hydrated || !isAuthenticated() || (user && user.role !== "super_admin")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">Super Admin</div>
            <p className="text-sm text-slate-600">Tenant management console</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-700">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-white">Restricted</span>
            <Link href="/admin/logout" className="hover:text-slate-900">
              Logout
            </Link>
          </div>
        </div>
        <nav className="border-t bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-2 text-sm">
            <Link
              href="/sa"
              className={
                pathname === "/sa"
                  ? "rounded-md bg-slate-900 px-3 py-2 font-medium text-white"
                  : "rounded-md px-3 py-2 font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }
            >
              Tenants
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
