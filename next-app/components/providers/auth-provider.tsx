"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  AuthUser,
  clearAuth,
  getToken,
  getUser,
  setToken,
  setUser,
} from "@/lib/auth-store";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (payload: { email: string; password: string; tenantSlug: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUserState(storedUser);
    }
    setLoading(false);
  }, []);

  const logout = () => {
    clearAuth();
    setUserState(null);
  };

  const login = async ({ email, password, tenantSlug }: { email: string; password: string; tenantSlug: string }) => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        token: string;
        user: AuthUser;
      }>("/api/auth/login", {
        method: "POST",
        body: { email, password, tenantSlug },
        onUnauthorized: logout,
      });

      if (data?.token && data?.user) {
        setToken(data.token);
        setUser(data.user);
        setUserState(data.user);
      } else {
        throw new Error("Invalid login response");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export function isAuthenticated() {
  return Boolean(getToken());
}

