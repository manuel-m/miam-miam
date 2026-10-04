import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { loginPath } from "../lib/navigation";
import { useAuth } from "./AuthProvider";

/** Protège une page : redirige vers /connexion?next=… si on n'est pas connecté. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to={loginPath(location)} replace />;
  return children;
}
