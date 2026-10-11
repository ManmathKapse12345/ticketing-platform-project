import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, refreshAccessToken, setAccessToken, setOnSessionExpired } from "@/lib/api";
import { AuthContext, type AuthStatus } from "./auth-context";
import type { User } from "./types";

const fetchMe = () => api.get<{ user: User }>("/users/me").then((r) => r.data.user);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const startSession = useCallback(async (accessToken: string) => {
    setAccessToken(accessToken);
    setUser(await fetchMe());
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("guest");
    queryClient.clear(); // drop cached data that belonged to the previous user
  }, [queryClient]);

  // On first load, use the refresh cookie (if there is one) to restore the session
  useEffect(() => {
    setOnSessionExpired(clearSession);
    refreshAccessToken().then(startSession).catch(clearSession);
  }, [startSession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<{ accessToken: string }>("/auth/login", { email, password });
      await startSession(data.accessToken);
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    setUser(await fetchMe());
  }, []);

  const value = useMemo(
    () => ({ user, status, login, startSession, logout, refreshUser }),
    [user, status, login, startSession, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
