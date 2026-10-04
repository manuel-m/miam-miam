import { useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { loginPath } from "../lib/navigation";
import { LoginPage } from "../pages/LoginPage";
import { useAuth } from "./AuthProvider";

/** Protège une page : redirige vers /connexion?next=… si on n'est pas connecté. */
export function RequireAuth({ children, preserveOnExpiry = false }: { children: ReactNode; preserveOnExpiry?: boolean }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [admitted, setAdmitted] = useState(isAuthenticated);
  if (isAuthenticated && !admitted) setAdmitted(true);

  // Garder le formulaire et son bloqueur de navigation pendant la reconnexion.
  if (preserveOnExpiry && admitted) {
    return (
      <>
        <div hidden={!isAuthenticated}>{children}</div>
        {!isAuthenticated && <LoginPage embedded />}
      </>
    );
  }
  if (!isAuthenticated) return <Navigate to={loginPath(location)} replace />;
  return children;
}
