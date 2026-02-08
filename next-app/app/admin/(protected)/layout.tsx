"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layouts/admin-shell";
import { useAuth, isAuthenticated } from "@/components/providers/auth-provider";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (!isAuthenticated()) {
      router.replace("/admin/login");
      return;
    }
    if (user && user.role !== "admin") {
      logout();
      router.replace("/admin/login");
    }
  }, [router, user, logout]);

  if (!hydrated || !isAuthenticated() || (user && user.role !== "admin")) {
    return null;
  }

  return (
    <AdminShell
      activePath={pathname || "/admin"}
    >
      {children}
    </AdminShell>
  );
}

