import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

export function SettingsNotifications() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ notifications_enabled: boolean; email_enabled: boolean }>(
      API_CONFIG.endpoints.auth.me
    )
      .then((data) => {
        setNotificationsEnabled(data.notifications_enabled ?? true);
        setEmailEnabled(data.email_enabled ?? true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updatePreference = (key: "notifications_enabled" | "email_enabled", value: boolean) => {
    api(API_CONFIG.endpoints.auth.preferences, {
      method: "PATCH",
      body: JSON.stringify({ [key]: value }),
    }).catch(() => {});
  };

  const handleNotificationsChange = (v: boolean) => {
    setNotificationsEnabled(v);
    updatePreference("notifications_enabled", v);
  };

  const handleEmailChange = (v: boolean) => {
    setEmailEnabled(v);
    updatePreference("email_enabled", v);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Notifikacije</h1>
        <p className="text-sm text-muted-foreground">Učitavanje...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Notifikacije</h1>
      <p className="text-sm text-muted-foreground mb-6">Obavijesti i email postavke (čuvaju se u bazi)</p>

      <div className="bg-white border border-border rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Obavijesti u aplikaciji</p>
            <p className="text-xs text-muted-foreground">Primaj notifikacije za nove zahtjeve, odobrenja i odbijanja</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => handleNotificationsChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
        </div>

        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Email obavijesti</p>
              <p className="text-xs text-muted-foreground">Primaj email za nove zahtjeve i važne događaje</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => handleEmailChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
