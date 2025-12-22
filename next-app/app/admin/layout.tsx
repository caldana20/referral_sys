"use client";

import { AuthProvider } from "@/components/providers/auth-provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

