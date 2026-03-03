import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { LayoutDashboard, FileText, Wallet, User, Bell } from "lucide-react";
import { AuthGuard } from "./auth-guard";
import { fetchMe } from "@/lib/api";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

export function MobileLayout() {
  const location = useLocation();
  const [navItems, setNavItems] = useState([
    { path: "/mobile", icon: LayoutDashboard, label: "Pregled" },
    { path: "/mobile/requests", icon: FileText, label: "Zahtijevi" },
    { path: "/mobile/finance", icon: Wallet, label: "Financije" },
    { path: "/mobile/profile", icon: User, label: "Profil" },
  ]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchMe()
      .then((u) => {
        if (u.role !== "ADMIN" && u.role !== "FINANCE") {
          setNavItems((prev) => prev.filter((i) => i.path !== "/mobile/finance"));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchCount = () => {
      api<{ count: number }>(API_CONFIG.endpoints.notificationsUnreadCount)
        .then((r) => setUnreadCount(r.count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) => {
    if (path === "/mobile" && location.pathname === "/mobile") return true;
    if (path !== "/mobile" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <AuthGuard>
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto">
      {/* Header with notifications */}
      <header className="flex-shrink-0 h-12 bg-white border-b border-border flex items-center justify-end px-4">
        <Link
          to="/mobile/notifications"
          className="relative p-2 -mr-2 active:bg-muted rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-destructive text-white text-[10px] font-medium rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-border">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                isActive(item.path) ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={2} />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
    </AuthGuard>
  );
}
