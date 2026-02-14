import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ToasterProvider } from "@/components/providers/toaster-provider";
import { TenantProvider } from "@/components/providers/tenant-provider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
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
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          spaceGrotesk.variable,
          fraunces.variable
        )}
      >
        <TenantProvider>{children}</TenantProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}
