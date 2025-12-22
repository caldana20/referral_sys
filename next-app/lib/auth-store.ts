import { isBrowser } from "./config";

const TOKEN_KEY = "referral.jwt";
const USER_KEY = "referral.user";

export type AuthUser = {
  id: number;
  email: string;
  role: string;
  tenantId?: number;
  tenantSlug?: string;
  name?: string;
};

export function getToken(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (!isBrowser) return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (!isBrowser) return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (!isBrowser) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch (err) {
    console.error("Failed to parse user from storage", err);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setUser(user: AuthUser) {
  if (!isBrowser) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  if (!isBrowser) return;
  localStorage.removeItem(USER_KEY);
}

export function clearAuth() {
  clearToken();
  clearUser();
}

