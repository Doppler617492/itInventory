import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";
import { fetchMe } from "@/lib/api";
import { Pencil, X } from "lucide-react";

interface UserOut {
  id: number;
  name: string;
  email: string;
  role: string;
  approver_location_ids: number[];
  approver_sector_ids: number[];
  approver_location_names: string[];
  approver_sector_names: string[];
}

interface LocationOut {
  id: number;
  name: string;
}

interface SectorOut {
  id: number;
  name: string;
}

export function SettingsApprovers() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserOut[]>([]);
  const [locations, setLocations] = useState<LocationOut[]>([]);
  const [sectors, setSectors] = useState<SectorOut[]>([]);
  const [form, setForm] = useState({ userId: "", locationIds: [] as number[], sectorIds: [] as number[] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editScope, setEditScope] = useState<{ locationIds: number[]; sectorIds: number[] }>({ locationIds: [], sectorIds: [] });
  const [editLoading, setEditLoading] = useState(false);

  const loadUsers = () => api<UserOut[]>(API_CONFIG.endpoints.users.list).then(setUsers).catch(() => setUsers([]));

  useEffect(() => {
    fetchMe().then((u) => setIsAdmin(u.role === "ADMIN")).catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      api<LocationOut[]>(API_CONFIG.endpoints.locations).then(setLocations).catch(() => setLocations([]));
      api<SectorOut[]>(API_CONFIG.endpoints.sectors).then(setSectors).catch(() => setSectors([]));
    }
  }, [isAdmin]);

  const approvers = users.filter((u) => ["ADMIN", "APPROVER", "MANAGER", "CEO"].includes(u.role));
  const approversForDropdown = approvers.filter((u) => u.role === "APPROVER");

  const addApproverScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId) return;
    setError("");
    setLoading(true);
    try {
      await api(API_CONFIG.endpoints.users.approverScope(parseInt(form.userId, 10)), {
        method: "PATCH",
        body: JSON.stringify({
          location_ids: form.locationIds,
          sector_ids: form.sectorIds,
        }),
      });
      setForm({ userId: "", locationIds: [], sectorIds: [] });
      loadUsers();
    } catch (err: unknown) {
      const d = (err as { detail?: string })?.detail;
      setError(typeof d === "string" ? d : "Greška pri dodavanju");
    } finally {
      setLoading(false);
    }
  };

  const saveScope = async (userId: number) => {
    setEditLoading(true);
    try {
      await api(API_CONFIG.endpoints.users.approverScope(userId), {
        method: "PATCH",
        body: JSON.stringify({
          location_ids: editScope.locationIds,
          sector_ids: editScope.sectorIds,
        }),
      });
      setEditingId(null);
      loadUsers();
    } finally {
      setEditLoading(false);
    }
  };

  const toggleLocation = (id: number) => {
    setForm((f) => ({
      ...f,
      locationIds: f.locationIds.includes(id) ? f.locationIds.filter((x) => x !== id) : [...f.locationIds, id],
    }));
  };

  const toggleSector = (id: number) => {
    setForm((f) => ({
      ...f,
      sectorIds: f.sectorIds.includes(id) ? f.sectorIds.filter((x) => x !== id) : [...f.sectorIds, id],
    }));
  };

  const toggleEditLocation = (id: number) => {
    setEditScope((e) => ({
      ...e,
      locationIds: e.locationIds.includes(id) ? e.locationIds.filter((x) => x !== id) : [...e.locationIds, id],
    }));
  };

  const toggleEditSector = (id: number) => {
    setEditScope((e) => ({
      ...e,
      sectorIds: e.sectorIds.includes(id) ? e.sectorIds.filter((x) => x !== id) : [...e.sectorIds, id],
    }));
  };

  const roleLabel: Record<string, string> = { ADMIN: "Administrator", APPROVER: "Odobravatelj", MANAGER: "Menadžer", FINANCE: "Finansije", CEO: "CEO" };
  const scopeLabel = (u: UserOut) => {
    if (u.approver_location_names.length === 0 && u.approver_sector_names.length === 0) return "Sve (global)";
    const parts = [];
    if (u.approver_location_names.length) parts.push(u.approver_location_names.join(", "));
    if (u.approver_sector_names.length) parts.push(u.approver_sector_names.join(", "));
    return parts.join(" | ");
  };

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Odobravatelji</h1>
        <p className="text-sm text-muted-foreground">Samo administrator može upravljati odobravateljima.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Odobravatelji</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Kreirajte odobravatelje i dodijelite im prodavnice/sektore za koje primaju notifikacije i odobravaju prvi.
      </p>

      <div className="space-y-6">
        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Dodaj odobravatelja</h3>
          <p className="text-xs text-muted-foreground mb-4">Odaberi korisnika iz liste (kreiran u Korisnici sa tipom Odobravatelj) i dodijeli mu prodavnice/sektore.</p>
          <form onSubmit={addApproverScope} className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Korisnik (Odobravatelj)</label>
              <select
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                required
              >
                <option value="">Odaberi korisnika</option>
                {approversForDropdown.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Prodavnice (za koje prima notifikacije)</label>
              <p className="text-xs text-muted-foreground mb-2">Ako ne odaberete ništa, odobravatelj prima za sve.</p>
              <div className="flex flex-wrap gap-2">
                {locations.map((loc) => (
                  <label
                    key={loc.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                      form.locationIds.includes(loc.id) ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.locationIds.includes(loc.id)}
                      onChange={() => toggleLocation(loc.id)}
                      className="sr-only"
                    />
                    {loc.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Sektori (za koje prima notifikacije)</label>
              <div className="flex flex-wrap gap-2">
                {sectors.map((sec) => (
                  <label
                    key={sec.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                      form.sectorIds.includes(sec.id) ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.sectorIds.includes(sec.id)}
                      onChange={() => toggleSector(sec.id)}
                      className="sr-only"
                    />
                    {sec.name}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || approversForDropdown.length === 0} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Dodavanje..." : "Dodaj scope"}
            </button>
          </form>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </div>

        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Lista odobravatelja</h3>
          <div className="space-y-2">
            {approvers.map((u) => (
              <div key={u.id} className="flex flex-col gap-2 py-3 px-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">{u.name}</span>
                    <span className="text-muted-foreground ml-2">{u.email}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({roleLabel[u.role] || u.role})</span>
                  </div>
                  {editingId === u.id ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveScope(u.id)}
                        disabled={editLoading}
                        className="px-2 py-1 bg-primary text-white rounded text-xs"
                      >
                        Sačuvaj
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(u.id);
                        setEditScope({ locationIds: u.approver_location_ids, sectorIds: u.approver_sector_ids });
                      }}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                {editingId === u.id ? (
                  <div className="mt-2 space-y-2 border-t border-border pt-2">
                    <div className="flex flex-wrap gap-2">
                      {locations.map((loc) => (
                        <label
                          key={loc.id}
                          className={`inline-flex items-center px-2 py-1 rounded border cursor-pointer text-xs ${
                            editScope.locationIds.includes(loc.id) ? "border-primary bg-primary/10" : "border-border"
                          }`}
                        >
                          <input type="checkbox" checked={editScope.locationIds.includes(loc.id)} onChange={() => toggleEditLocation(loc.id)} className="sr-only" />
                          {loc.name}
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sectors.map((sec) => (
                        <label
                          key={sec.id}
                          className={`inline-flex items-center px-2 py-1 rounded border cursor-pointer text-xs ${
                            editScope.sectorIds.includes(sec.id) ? "border-primary bg-primary/10" : "border-border"
                          }`}
                        >
                          <input type="checkbox" checked={editScope.sectorIds.includes(sec.id)} onChange={() => toggleEditSector(sec.id)} className="sr-only" />
                          {sec.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Scope: {scopeLabel(u)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
