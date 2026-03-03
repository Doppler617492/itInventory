import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Bell, Check } from "lucide-react";
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

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Notification[]>(API_CONFIG.endpoints.notifications)
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = () => {
    api(API_CONFIG.endpoints.notifications + "/mark-all-read", { method: "POST" })
      .then(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))))
      .catch(() => {});
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    return new Date(d).toLocaleString("bs", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Učitavanje notifikacija...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notifikacije</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sve obavijesti o zahtjevima i događajima
          </p>
        </div>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
          >
            <Check className="w-4 h-4" strokeWidth={2} />
            Označi sve pročitano
          </button>
        )}
      </div>

      <div className="bg-white border border-border rounded-lg divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" strokeWidth={1.5} />
            <p>Nema notifikacija</p>
            <p className="text-sm mt-1">Novi zahtjevi i događaji će se ovdje prikazati</p>
          </div>
        ) : (
          notifications.map((n) => (
            <Link
              key={n.id}
              to={n.link || "#"}
              className={`block p-4 hover:bg-muted transition-colors ${!n.read ? "bg-primary/5" : ""}`}
            >
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              {n.message && (
                <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">{formatDate(n.created_at)}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
