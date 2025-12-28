const resolvedApiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
if (!resolvedApiBase) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is required");
}

export const API_BASE_URL = resolvedApiBase;

export const isBrowser = typeof window !== "undefined";

// Host used to resolve tenant context on the frontend
export const CURRENT_HOST = (() => {
  if (typeof window !== "undefined") return window.location.hostname;
  throw new Error("CURRENT_HOST unavailable: window is undefined (set at runtime)");
})();

