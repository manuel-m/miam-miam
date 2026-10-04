import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

/** N'accepte que des chemins internes pour ?next= (évite une redirection vers un autre site). */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginPage({ embedded = false }: { embedded?: boolean }) {
  const { isAuthenticated, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get("next"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!embedded && isAuthenticated && !pending) return <Navigate to={next} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(username, password);
      if (!embedded) navigate(next, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Identifiant ou mot de passe incorrect."
          : "Connexion impossible. Le serveur est-il démarré ?",
      );
      setPending(false);
    }
  };

  return (
    <div className="flex justify-center pt-8 sm:pt-16">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold">Connexion</h1>
          <p className="mt-1 text-sm text-stone-500">
            {embedded ? "Reconnecte-toi pour continuer. Ton brouillon est conservé." : "Pour gérer tes favoris et tes recettes."}
          </p>
        </div>
        <div>
          <label htmlFor="username" className="label">Identifiant</label>
          <input
            id="username"
            className="input w-full"
            autoComplete="username"
            autoFocus
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="label">Mot de passe</label>
          <input
            id="password"
            type="password"
            className="input w-full"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
