import { SESSION_EXPIRED_EVENT, tokenStore } from "../auth/tokenStore";

const BASE_URL = "/api"; // proxifié vers FastAPI par Vite (voir vite.config.ts)

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    // Erreurs de validation FastAPI (422) : liste de { msg, loc, … }
    if (Array.isArray(body.detail)) {
      return body.detail.map((d: { msg: string }) => d.msg).join(", ");
    }
  } catch {
    // corps non JSON
  }
  return `Erreur ${res.status}`;
}

/** fetch + token JWT + JSON + erreurs typées. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(BASE_URL + path, { ...init, headers });

  if (res.status === 401 && token) {
    // Token refusé (expiré, secret changé…) : on se déconnecte.
    tokenStore.set(null);
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Télécharge l'export JSON de la base (GET /export). */
export async function downloadExport(): Promise<void> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE_URL}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res));

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "recettes.json";
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
