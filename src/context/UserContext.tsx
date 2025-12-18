"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type Role = "customer" | "admin";

export type CurrentUser = {
  sub: string;
  email: string;
  role: Role;
} | null;

type UserContextValue = {
  user: CurrentUser;
  loading: boolean;
  refresh: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

async function fetchCurrentUser(signal?: AbortSignal) {
  const res = await fetch("/api/me", {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  if (!res.ok) {
    throw new Error("failed_to_load_user");
  }
  const data = await res.json();
  return (data?.user as CurrentUser) ?? null;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const nextUser = await fetchCurrentUser(controller.signal);
      setUser(nextUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  const value = React.useMemo(
    () => ({
      user,
      loading,
      refresh,
    }),
    [loading, refresh, user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
}
