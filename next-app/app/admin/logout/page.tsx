"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

export default function AdminLogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    router.replace("/admin/login");
  }, [logout, router]);

  return <div className="text-sm text-slate-600">Signing out…</div>;
}

