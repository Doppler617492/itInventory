import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { Bell, ChevronRight, LogOut, Moon, Globe, Shield, HelpCircle, Monitor } from "lucide-react";
import { fetchMe, clearTokens } from "@/lib/api";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

const roleLabel: Record<string, string> = {
  APPROVER: "Odobravatelj",
  MANAGER: "Menadžer",
  FINANCE: "Financije",
  CEO: "CEO",
  ADMIN: "Administrator",
  USER: "Korisnik",
};

export function MobileProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const handleLogout = () => {
    clearTokens();
    navigate("/login");
  };

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="min-h-screen">
      <div className="bg-primary text-white p-4">
        <h1 className="text-lg font-semibold mb-6">Profil</h1>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-2xl font-semibold">{initials}</span>
          </div>
          <div>
            <p className="font-semibold">{user?.name || "..."}</p>
            <p className="text-sm text-white/80">{roleLabel[user?.role || ""] || user?.role || "-"}</p>
            <p className="text-xs text-white/70 mt-0.5">{user?.email || "-"}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <h3 className="px-4 py-3 text-sm font-semibold text-muted-foreground bg-slate-50">
            PODEŠAVANJA
          </h3>

          <Link to="/mobile/notifications" className="w-full flex items-center justify-between px-4 py-3 border-b border-border active:bg-slate-50">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
              <span className="text-sm text-foreground">Notifikacije</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
          </Link>

          <button className="w-full flex items-center justify-between px-4 py-3 border-b border-border active:bg-slate-50">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
              <span className="text-sm text-foreground">Tamni režim</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Isključeno</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
            </div>
          </button>

          <button className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-50">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
              <span className="text-sm text-foreground">Jezik</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Srpski</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
            </div>
          </button>
        </div>

        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <h3 className="px-4 py-3 text-sm font-semibold text-muted-foreground bg-slate-50">
            NALOG
          </h3>

          <button className="w-full flex items-center justify-between px-4 py-3 border-b border-border active:bg-slate-50">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
              <span className="text-sm text-foreground">Bezbednost</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
          </button>

          <button className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-50">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
              <span className="text-sm text-foreground">Pomoć i podrška</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-destructive text-destructive rounded-lg font-medium active:bg-destructive/5"
        >
          <LogOut className="w-5 h-5" strokeWidth={2} />
          Odjavi se
        </button>

        <a
          href="/"
          className="block w-full px-4 py-3 bg-white border border-primary text-primary rounded-lg font-medium text-center active:bg-primary/5"
        >
          <div className="flex items-center justify-center gap-2">
            <Monitor className="w-5 h-5" strokeWidth={2} />
            Prebaci na desktop pregled
          </div>
        </a>

        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground">IT nabavka v1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">© 2024</p>
        </div>
      </div>
    </div>
  );
}
