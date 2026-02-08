const resolvedApiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
if (!resolvedApiBase) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is required");
}

export const API_BASE_URL = resolvedApiBase;

export const isBrowser = typeof window !== "undefined";

// Host used to resolve tenant context on the frontend
const envHost = process.env.NEXT_PUBLIC_SITE_HOST || process.env.NEXT_PUBLIC_API_HOST;
if (!isBrowser && !envHost) {
  throw new Error("Set NEXT_PUBLIC_SITE_HOST for SSR host resolution");
}

export const CURRENT_HOST = isBrowser ? window.location.hostname : envHost as string;

export const BILLING_HOST = process.env.NEXT_PUBLIC_BILLING_HOST?.toLowerCase() || null;

const derivedTenantBase = envHost
  ? envHost.replace(/^[^.]+\./, "").toLowerCase()
  : null;

export const TENANT_HOST_BASE =
  process.env.NEXT_PUBLIC_TENANT_HOST_BASE?.toLowerCase() || derivedTenantBase;

