import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { authService } from "../services/authService";
import { tokenStorage } from "../utils/tokenStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      const access = tokenStorage.getAccess();
      if (!access) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authService.me();
        setUser(data);
      } catch {
        tokenStorage.clear();
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  const login = async (email, password) => {
    const { data } = await authService.login(email, password);
    tokenStorage.setTokens(data.access, data.refresh);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    const refresh = tokenStorage.getRefresh();
    try {
      if (refresh) await authService.logout(refresh);
    } catch {
      // Even if the blacklist call fails, proceed with a local logout.
    }
    tokenStorage.clear();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      role: user?.role,
      login,
      logout,
      setUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
