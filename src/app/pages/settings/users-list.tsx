import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";
import { fetchMe } from "@/lib/api";
import { Link } from "react-router";
import { Users, KeyRound, Trash2 } from "lucide-react";

interface UserOut {
  id: number;
  name: string;
  email: string;
  role: string;
  location_id: number | null;
  location_name: string | null;
  approver_location_names: string[];
  approver_sector_names: string[];
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  APPROVER: "Odobravatelj",
  MANAGER: "Menadžer",
  FINANCE: "Financije",
  CEO: "CEO",
};

export function SettingsUsersList() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [users, setUsers] = useState<UserOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetUser, setResetUser] = useState<UserOut | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserOut | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    api<UserOut[]>(API_CONFIG.endpoints.users.list)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMe().then((u) => {
      setIsAdmin(u.role === "ADMIN");
      setCurrentUserId(u.id);
    }).catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const handleResetPassword = async (e: React.FormEvent) => {
    if (!resetUser || resetPassword.length < 6) return;
    e.preventDefault();
    setResetLoading(true);
    try {
      await api(API_CONFIG.endpoints.users.resetPassword(resetUser.id), {
        method: "PATCH",
        body: JSON.stringify({ new_password: resetPassword }),
      });
      setResetUser(null);
      setResetPassword("");
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      await api(API_CONFIG.endpoints.users.delete(deleteUser.id), { method: "DELETE" });
      setDeleteUser(null);
      loadUsers();
    } catch (e: unknown) {
      const err = e as { detail?: string };
      alert(err.detail || "Greška pri brisanju korisnika");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Lista korisnika</h1>
        <p className="text-sm text-muted-foreground">Samo administrator može vidjeti listu korisnika.</p>
      </div>
    );
  }

  const scopeLabel = (u: UserOut) => {
    if (u.approver_location_names.length === 0 && u.approver_sector_names.length === 0) return "–";
    const parts = [];
    if (u.approver_location_names.length) parts.push(u.approver_location_names.join(", "));
    if (u.approver_sector_names.length) parts.push(u.approver_sector_names.join(", "));
    return parts.join(" | ");
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Lista korisnika</h1>
          <p className="text-sm text-muted-foreground mt-1">Svi korisnici koji imaju pristup sistemu</p>
        </div>
        <Link
          to="/settings/users"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
        >
          <Users className="w-4 h-4" strokeWidth={2} />
          Kreiraj korisnika
        </Link>
      </div>

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Učitavanje...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nema korisnika.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-foreground">Ime</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Uloga</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Lokacija</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Scope</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground w-24">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.location_name || "–"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate" title={scopeLabel(u)}>
                      {scopeLabel(u)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setResetUser(u)}
                          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title="Resetuj lozinku"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteUser(u)}
                          disabled={u.id === currentUserId}
                          className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                          title={u.id === currentUserId ? "Ne možete ukloniti vlastiti nalog" : "Ukloni korisnika"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Ukupno: {users.length} korisnik(a). Korisnik dobija email kada mu se resetuje lozinka ili ukloni nalog.
      </p>

      {/* Reset lozinke modal */}
      {resetUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setResetUser(null)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground mb-2">Resetuj lozinku</h3>
            <p className="text-sm text-muted-foreground mb-4">Za: {resetUser.name} ({resetUser.email})</p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Nova lozinka</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  placeholder="Min. 6 karaktera"
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setResetUser(null)} className="px-4 py-2 border border-border rounded-lg text-sm">
                  Odustani
                </button>
                <button type="submit" disabled={resetLoading || resetPassword.length < 6} className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50">
                  {resetLoading ? "Čeka..." : "Resetuj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ukloni korisnika modal */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteUser(null)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground mb-2">Ukloni korisnika</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Da li ste sigurni da želite ukloniti <strong>{deleteUser.name}</strong> ({deleteUser.email})? Korisnik će primiti email obavijest.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteUser(null)} className="px-4 py-2 border border-border rounded-lg text-sm">
                Odustani
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-destructive text-white rounded-lg text-sm hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleteLoading ? "Čeka..." : "Ukloni"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
