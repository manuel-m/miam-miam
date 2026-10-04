// Le token JWT vit ici (et dans localStorage) pour être lisible hors de React,
// par apiFetch notamment. Les composants s'y abonnent via useSyncExternalStore.

const STORAGE_KEY = "miam-miam.token";
export const SESSION_EXPIRED_EVENT = "miam-miam:session-expired";

type Listener = () => void;
const listeners = new Set<Listener>();

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

let current = readStorage();

export const tokenStore = {
  get: (): string | null => current,

  set(token: string | null) {
    current = token;
    try {
      if (token) localStorage.setItem(STORAGE_KEY, token);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // stockage indisponible (navigation privée…) : le token reste en mémoire
    }
    listeners.forEach((listener) => listener());
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export interface TokenClaims {
  sub: string;
  exp: number; // secondes depuis epoch
}

/** Lit le contenu du JWT (sans vérifier la signature : c'est le rôle du serveur). */
export function decodeToken(token: string): TokenClaims | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)) as TokenClaims;
  } catch {
    return null;
  }
}
