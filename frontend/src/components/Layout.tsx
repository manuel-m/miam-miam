import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { downloadExport } from "../api/client";
import { useFavorites } from "../api/queries";
import { useAuth } from "../auth/AuthProvider";
import { useRequireLogin } from "../lib/navigation";
import { useToast } from "./Toast";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-brand-50 text-brand-700" : "text-stone-600 hover:text-stone-900"
  }`;

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${isActive ? "text-brand-600" : "text-stone-500"}`;

function FavoritesCount() {
  const { data } = useFavorites();
  if (!data?.length) return null;
  return <span className="ml-1 text-rose-500">♥{data.length}</span>;
}

function UserMenu() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <NavLink to="/connexion" className="btn-secondary">
        Connexion
      </NavLink>
    );
  }

  return <UserDropdown />;
}

function UserDropdown() {
  const { username, logout } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer sur clic à l'extérieur ou Échap.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const onExport = async () => {
    setOpen(false);
    try {
      await downloadExport();
      show("Export téléchargé");
    } catch {
      show("L'export a échoué");
    }
  };

  const onLogout = () => {
    setOpen(false);
    logout();
    navigate("/");
    show("Déconnecté");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu utilisateur"
        className="grid size-9 place-items-center rounded-full bg-stone-200 font-semibold uppercase text-stone-700 hover:bg-stone-300"
      >
        {username?.charAt(0) ?? "?"}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
          <p className="px-4 py-2 text-sm text-stone-500">
            Connecté : <strong className="text-stone-800">{username}</strong>
          </p>
          <hr className="border-stone-100" />
          <button type="button" role="menuitem" onClick={onExport} className="menu-item">
            Exporter (JSON)
          </button>
          <button type="button" role="menuitem" onClick={onLogout} className="menu-item">
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const navigate = useNavigate();
  const requireLogin = useRequireLogin();
  const newRecipe = () => requireLogin() && navigate("/recettes/nouvelle");

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <NavLink to="/" className="mr-4 flex items-center gap-1.5 text-lg font-bold">
            <span aria-hidden="true">🥕</span> Miam-miam
          </NavLink>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink to="/" end className={navClass}>
              Recettes
            </NavLink>
            <NavLink to="/favoris" className={navClass}>
              Favoris
              <FavoritesCount />
            </NavLink>
            <NavLink to="/journal" className={navClass}>
              Journal
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={newRecipe} className="btn-primary hidden sm:inline-flex">
              + Nouvelle
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      {/* Barre d'onglets mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        <NavLink to="/" end className={tabClass}>
          <span className="text-lg">🍲</span>Recettes
        </NavLink>
        <button type="button" onClick={newRecipe} className={tabClass({ isActive: false })}>
          <span className="text-lg">＋</span>Nouvelle
        </button>
        <NavLink to="/favoris" className={tabClass}>
          <span className="text-lg">♥</span>Favoris
        </NavLink>
        <NavLink to="/journal" className={tabClass}>
          <span className="text-lg">📖</span>Journal
        </NavLink>
      </nav>
    </>
  );
}
