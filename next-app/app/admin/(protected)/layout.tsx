"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/layouts/admin-shell";
import { useAuth, isAuthenticated } from "@/components/providers/auth-provider";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/admin/login");
    }
  }, [router, user]);

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <AdminShell
      activePath={pathname || "/admin"}
      title="Admin"
      description="Manage clients, referrals, rewards, and invitations."
    >
      {children}
    </AdminShell>
  );
}

