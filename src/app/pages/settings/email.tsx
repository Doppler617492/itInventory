import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";
import { fetchMe } from "@/lib/api";

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_from: string;
}

export function SettingsEmail() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMe().then((u) => setIsAdmin(u.role === "ADMIN")).catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    if (isAdmin) {
      api<EmailConfig>(API_CONFIG.endpoints.settings.email)
        .then((c) => {
          setSmtpHost(c.smtp_host || "");
          setSmtpPort(String(c.smtp_port || 587));
          setSmtpUser(c.smtp_user || "");
          setSmtpFrom(c.smtp_from || "");
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api(API_CONFIG.endpoints.settings.email, {
        method: "PUT",
        body: JSON.stringify({
          smtp_host: smtpHost.trim(),
          smtp_port: parseInt(smtpPort, 10),
          smtp_user: smtpUser.trim(),
          smtp_password: smtpPassword || undefined,
          smtp_from: smtpFrom.trim(),
        }),
      });
      setSmtpPassword("");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Email (SMTP)</h1>
        <p className="text-sm text-muted-foreground">Samo administrator može konfigurirati SMTP server. Kontaktirajte administratora.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Email (SMTP)</h1>
      <p className="text-sm text-muted-foreground mb-6">Konfiguracija za slanje email obavijesti</p>

      <div className="bg-white border border-border rounded-lg p-6">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">SMTP host</label>
            <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">SMTP port</label>
            <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">SMTP korisnik (email)</label>
            <input type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="noreply@cungu.com" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">SMTP lozinka</label>
            <input type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder="Ostavite prazno da zadrzite postojeću" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Pošiljalac (From)</label>
            <input type="text" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="IT Nabavka <noreply@cungu.com>" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
            {loading ? "Čuvanje..." : "Sačuvaj"}
          </button>
        </form>
      </div>
    </div>
  );
}
