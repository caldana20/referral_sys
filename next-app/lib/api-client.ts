import { API_BASE_URL, isBrowser } from "./config";
import { clearAuth, getToken } from "./auth-store";

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit | Record<string, unknown> | null;
  headers?: HeadersInit;
  onUnauthorized?: () => void;
  cache?: RequestCache;
};

type ApiError = {
  status: number;
  message: string;
};

async function buildHeaders(options?: ApiRequestOptions): Promise<HeadersInit> {
  const token = getToken();
  const base: HeadersInit = {
    "Content-Type": "application/json",
    ...(options?.headers || {}),
  };

  if (token) {
    return { ...base, Authorization: `Bearer ${token}` };
  }
  return base;
}

function makeUrl(path: string) {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

export async function apiFetch<T = unknown>(path: string, options?: ApiRequestOptions): Promise<T> {
  const rawBody = options?.body;
  const normalizedBody: BodyInit | undefined =
    rawBody == null
      ? undefined
      : rawBody instanceof FormData ||
          rawBody instanceof Blob ||
          rawBody instanceof ArrayBuffer ||
          rawBody instanceof URLSearchParams ||
          typeof rawBody === "string"
        ? rawBody
        : JSON.stringify(rawBody);

  const isFormLike =
    rawBody instanceof FormData ||
    rawBody instanceof Blob ||
    rawBody instanceof ArrayBuffer ||
    rawBody instanceof URLSearchParams;

  const headers = await buildHeaders(options);
  if (isFormLike && (headers as Record<string, string>)["Content-Type"]) {
    // Let the browser set the multipart boundary
    delete (headers as Record<string, string>)["Content-Type"];
  }

  const res = await fetch(makeUrl(path), {
    method: options?.method || "GET",
    headers,
    body: normalizedBody,
    cache: options?.cache,
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) {
    clearAuth();
    options?.onUnauthorized?.();
    throw { status: res.status, message: "Unauthorized" } satisfies ApiError;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || "Request failed";
    throw { status: res.status, message } satisfies ApiError;
  }

  return data as T;
}

export function inBrowser() {
  return isBrowser;
}

