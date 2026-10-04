import { Link } from "react-router-dom";
import { EmptyState } from "../components/States";

export function NotFoundPage({ message = "Cette page n'existe pas." }: { message?: string }) {
  return (
    <EmptyState title={message}>
      <Link to="/" className="btn-primary">
        Retour aux recettes
      </Link>
    </EmptyState>
  );
}
