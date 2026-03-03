import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  FileText,
  Wallet,
  Laptop,
  RefreshCw,
  BarChart3,
  Bell,
  Settings,
  User,
  Smartphone,
  Mail,
  Users,
  UserCheck,
  ChevronDown,
  ChevronRight,
  UserCircle,
  LogOut,
} from "lucide-react";
import { NotificationsDropdown } from "./notifications-dropdown";
import { AuthGuard } from "./auth-guard";
import { fetchMe, clearTokens } from "@/lib/api";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  const handleLogout = () => {
    clearTokens();
    navigate("/login");
  };

  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const roleLabel: Record<string, string> = {
    ADMIN: "Administrator",
    APPROVER: "Odobravatelj",
    MANAGER: "Menadžer",
    FINANCE: "Financije",
    CEO: "CEO",
    USER: "Korisnik",
  };
  useEffect(() => {
    fetchMe()
      .then((u) => {
        setIsAdmin(u.role === "ADMIN");
        setUserRole(u.role || "");
        setUserName(u.name || "");
      })
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/settings")) {
      setSettingsExpanded(true);
    }
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const allNavItems = [
    { path: "/", icon: LayoutDashboard, label: "Kontrolna tabla" },
    { path: "/requests", icon: FileText, label: "Zahtijevi" },
    { path: "/finance", icon: Wallet, label: "Financije" },
    { path: "/assets", icon: Laptop, label: "Imovina" },
    { path: "/vendors", icon: Users, label: "Dobavljači" },
    { path: "/subscriptions", icon: RefreshCw, label: "Pretplate" },
    { path: "/reports", icon: BarChart3, label: "Izvještaji" },
  ];

  let navItems = allNavItems;
  if (userRole === "ADMIN") {
    navItems = allNavItems;
  } else if (userRole === "FINANCE") {
    navItems = allNavItems.filter((i) => i.path === "/" || i.path === "/finance");
  } else {
    // Odobravatelj, menadžer, CEO, obični korisnici: samo tabla i zahtjevi
    navItems = allNavItems.filter((i) => i.path === "/" || i.path === "/requests");
  }

  const settingsItems = [
    { path: "/settings/notifications", icon: Bell, label: "Notifikacije" },
    { path: "/settings/email", icon: Mail, label: "Email" },
    { path: "/settings/approvers", icon: UserCheck, label: "Odobravatelji" },
    { path: "/settings/users", icon: Users, label: "Korisnici" },
    { path: "/settings/users-list", icon: UserCircle, label: "Lista korisnika" },
  ];

  const isSettingsActive = location.pathname.startsWith("/settings");

  return (
    <AuthGuard>
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <span className="font-semibold text-foreground">IT nabavka</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={2} />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}

          <div className="pt-2 mt-2 border-t border-border">
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => setSettingsExpanded((e) => !e)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors ${isSettingsActive ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <Settings className="w-5 h-5" strokeWidth={2} />
                  <span className="text-sm font-medium flex-1 text-left">Podešavanja</span>
                  {settingsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {settingsExpanded && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {settingsItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          isActive(item.path)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <item.icon className="w-4 h-4" strokeWidth={2} />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                to="/settings/notifications"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isSettingsActive ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Settings className="w-5 h-5" strokeWidth={2} />
                <span className="text-sm font-medium">Podešavanja</span>
              </Link>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{userName || "..."}</div>
              <div className="text-xs text-muted-foreground">{roleLabel[userRole] || userRole || "-"}</div>
            </div>
          </div>
          <Link
            to="/mobile"
            className="flex items-center gap-3 px-3 py-2 mt-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors"
          >
            <Smartphone className="w-4 h-4" strokeWidth={2} />
            <span>Mobilni pregled</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 mt-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
            <span>Odjavi se</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <NotificationsDropdown />
            <Link to="/settings/notifications" className="p-2 hover:bg-muted rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
    </AuthGuard>
  );
}