import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ToasterProvider } from "@/components/providers/toaster-provider";
import { TenantProvider } from "@/components/providers/tenant-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Referral System",
  description: "Multi-tenant referral and estimate management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn("bg-slate-50 text-slate-900 antialiased", inter.variable)}>
        <TenantProvider>{children}</TenantProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}
