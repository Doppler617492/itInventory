import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface Notification {
  id: number;
  title: string;
  message: string | null;
  type: string;
  link: string | null;
  read: boolean;
  created_at: string | null;
}

export function NotificationsDropdown() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = () => {
    api<{ count: number }>(API_CONFIG.endpoints.notificationsUnreadCount)
      .then((r) => setUnreadCount(r.count))
      .catch(() => {});
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) {
      api<Notification[]>(API_CONFIG.endpoints.notifications)
        .then(setNotifications)
        .catch(() => setNotifications([]));
    }
  }, [open]);

  const markAllRead = () => {
    api(API_CONFIG.endpoints.notifications + "/mark-all-read", { method: "POST" })
      .then(() => {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      })
      .catch(() => {});
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "Upravo";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-muted rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-destructive text-white text-xs rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-96 max-h-[400px] overflow-y-auto bg-white border border-border rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-border flex justify-between items-center">
              <span className="font-semibold text-foreground">Notifikacije</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  Označi sve pročitano
                </button>
              )}
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Nema novih obavijesti
                </div>
              ) : (
                notifications.map((n) => (
                  <Link
                    key={n.id}
                    to={n.link || "#"}
                    onClick={() => setOpen(false)}
                    className={`block p-3 border-b border-border hover:bg-muted transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {n.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
                  </Link>
                ))
              )}
            </div>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block p-3 text-center text-sm text-primary border-t border-border hover:bg-muted"
            >
              Sve notifikacije
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
