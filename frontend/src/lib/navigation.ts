import { useCallback } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export function loginPath(location: Pick<Location, "pathname" | "search">): string {
  return `/connexion?next=${encodeURIComponent(location.pathname + location.search)}`;
}

/**
 * Pour les actions réservées aux utilisateurs connectés.
 * Renvoie true si on peut continuer, sinon envoie vers la connexion (puis retour ici).
 */
export function useRequireLogin(): () => boolean {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    if (isAuthenticated) return true;
    navigate(loginPath(location));
    return false;
  }, [isAuthenticated, navigate, location]);
}
