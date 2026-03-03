import { Navigate, useLocation } from "react-router";
import { isAuthenticated } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}
