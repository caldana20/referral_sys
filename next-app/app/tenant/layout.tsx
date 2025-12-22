import type { ReactNode } from "react";
import { PublicShell } from "@/components/layouts/public-shell";

export default function TenantLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}

