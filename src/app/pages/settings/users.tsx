import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";
import { fetchMe } from "@/lib/api";

interface UserOut {
  id: number;
  name: string;
  email: string;
  role: string;
  location_id: number | null;
  location_name: string | null;
}

interface LocationOut {
  id: number;
  name: string;
}

export function SettingsUsers() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserOut[]>([]);
  const [locations, setLocations] = useState<LocationOut[]>([]);
  const [createUserForm, setCreateUserForm] = useState({ name: "", email: "", password: "", role: "APPROVER" as string, locationId: "" });
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState("");

  useEffect(() => {
    fetchMe().then((u) => setIsAdmin(u.role === "ADMIN")).catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    if (isAdmin) {
      api<UserOut[]>(API_CONFIG.endpoints.users.list).then(setUsers).catch(() => setUsers([]));
      api<LocationOut[]>(API_CONFIG.endpoints.locations).then(setLocations).catch(() => setLocations([]));
    }
  }, [isAdmin]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError("");
    setCreateUserLoading(true);
    try {
      const payload: { name: string; email: string; password: string; role: string; location_id?: number } = {
        name: createUserForm.name.trim(),
        email: createUserForm.email.trim(),
        password: createUserForm.password,
        role: createUserForm.role,
      };
      await api(API_CONFIG.endpoints.users.create, { method: "POST", body: JSON.stringify(payload) });
      setCreateUserForm({ name: "", email: "", password: "", role: "APPROVER", locationId: "" });
      api<UserOut[]>(API_CONFIG.endpoints.users.list).then(setUsers).catch(() => {});
    } catch (err: unknown) {
      const d = (err as { detail?: string })?.detail;
      setCreateUserError(typeof d === "string" ? d : "Greška pri kreiranju");
    } finally {
      setCreateUserLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Korisnici</h1>
        <p className="text-sm text-muted-foreground">Samo administrator može upravljati korisnicima.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Korisnici</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Kreirajte Administratora, Odobravatelja ili Finanse. Scope odobravatelja se dodaje u Odobravatelji.
      </p>

      <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-2">Kreiraj korisnika</h3>
          <p className="text-xs text-muted-foreground mb-4">Administrator ili Odobravatelj.</p>
          <form onSubmit={createUser} className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Tip</label>
              <select
                value={createUserForm.role}
                onChange={(e) => setCreateUserForm((f) => ({ ...f, role: e.target.value, locationId: "" }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              >
                <option value="ADMIN">Administrator</option>
                <option value="APPROVER">Odobravatelj</option>
                <option value="FINANCE">Finansije</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Ime i prezime</label>
              <input type="text" value={createUserForm.name} onChange={(e) => setCreateUserForm((f) => ({ ...f, name: e.target.value }))} placeholder="Marko Petrović" className="w-full px-3 py-2 border border-border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Email</label>
              <input type="email" value={createUserForm.email} onChange={(e) => setCreateUserForm((f) => ({ ...f, email: e.target.value }))} placeholder="marko@cungu.com" className="w-full px-3 py-2 border border-border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Lozinka</label>
              <input type="password" value={createUserForm.password} onChange={(e) => setCreateUserForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="w-full px-3 py-2 border border-border rounded-lg text-sm" required minLength={6} />
            </div>
            <button type="submit" disabled={createUserLoading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
              {createUserLoading ? "Kreiranje..." : "Kreiraj"}
            </button>
          </form>
          {createUserError && <p className="text-sm text-destructive mt-2">{createUserError}</p>}
      </div>
    </div>
  );
}
