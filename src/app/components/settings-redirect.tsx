import { Navigate } from "react-router";

export function SettingsRedirect() {
  return <Navigate to="/settings/notifications" replace />;
}
