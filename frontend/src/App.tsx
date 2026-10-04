import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { ApiError } from "./api/client";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import { FavoritesPage } from "./pages/FavoritesPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RecipeFormPage } from "./pages/RecipeFormPage";
import { RecipePage } from "./pages/RecipePage";
import { RecipesPage } from "./pages/RecipesPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Inutile de réessayer une erreur 4xx (404, 401…) : elle se reproduira.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
});

// createBrowserRouter (et non <BrowserRouter>) : nécessaire pour useBlocker dans le formulaire.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <RecipesPage /> },
      { path: "/recettes/nouvelle", element: <RequireAuth><RecipeFormPage /></RequireAuth> },
      { path: "/recettes/:id", element: <RecipePage /> },
      { path: "/recettes/:id/modifier", element: <RequireAuth><RecipeFormPage /></RequireAuth> },
      { path: "/favoris", element: <RequireAuth><FavoritesPage /></RequireAuth> },
      { path: "/connexion", element: <LoginPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
