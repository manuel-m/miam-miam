import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { apiFetch } from "../api/client";
import { keys } from "../api/keys";
import type { Token } from "../api/types";
import { useToast } from "../components/Toast";
import { SESSION_EXPIRED_EVENT, decodeToken, tokenStore } from "./tokenStore";

interface AuthValue {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

const SESSION_EXPIRED_MESSAGE = "Session expirée, reconnecte-toi";

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(tokenStore.subscribe, tokenStore.get);
  const claims = useMemo(() => (token ? decodeToken(token) : null), [token]);
  const queryClient = useQueryClient();
  const { show } = useToast();

  // Déconnexion automatique à l'expiration du token.
  useEffect(() => {
    if (!token) return;
    const remainingMs = claims ? claims.exp * 1000 - Date.now() : 0;
    if (remainingMs <= 0) {
      tokenStore.set(null);
      return;
    }
    const timer = setTimeout(() => {
      tokenStore.set(null);
      show(SESSION_EXPIRED_MESSAGE);
    }, Math.min(remainingMs, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [token, claims, show]);

  // Token refusé par le serveur (voir apiFetch).
  useEffect(() => {
    const onExpired = () => show(SESSION_EXPIRED_MESSAGE);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [show]);

  // Les favoris appartiennent à l'utilisateur : on les oublie à la déconnexion.
  useEffect(() => {
    if (!token) queryClient.removeQueries({ queryKey: keys.favorites });
  }, [token, queryClient]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiFetch<Token>("/auth/token", {
      method: "POST",
      body: new URLSearchParams({ username, password }), // formulaire OAuth2
    });
    tokenStore.set(res.access_token);
  }, []);

  const logout = useCallback(() => tokenStore.set(null), []);

  const value = useMemo<AuthValue>(
    () => ({ isAuthenticated: !!token, username: claims?.sub ?? null, login, logout }),
    [token, claims, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return value;
}
