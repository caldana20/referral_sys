import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PublicShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
};

export function PublicShell({ children, title, subtitle, className }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className={cn("mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10", className)}>
        {title ? <h1 className="text-3xl font-semibold text-slate-900">{title}</h1> : null}
        {subtitle ? <p className="mt-2 text-base text-slate-600">{subtitle}</p> : null}
        <div className={cn(title || subtitle ? "mt-6" : "")}>{children}</div>
      </main>
    </div>
  );
}

