export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

export const isBrowser = typeof window !== "undefined";

// Host used to resolve tenant context on the frontend
export const CURRENT_HOST =
  typeof window !== "undefined" ? window.location.hostname : process.env.NEXT_PUBLIC_HOST || "localhost";

