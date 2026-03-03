import { useEffect, useState } from "react";
import { Search, Filter, Plus, Download, Trash2, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface UserOption {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AssetRow {
  id: number;
  name: string;
  serial_no: string | null;
  location: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  internal_barcode: string | null;
  purchase_date: string | null;
  warranty_until: string | null;
  cost_gross: number | null;
}

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Maintenance: "bg-amber-100 text-amber-700",
  Retired: "bg-slate-100 text-slate-700",
};

export function Assets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSerial, setAddSerial] = useState("");
  const [addLocation, setAddLocation] = useState("");
  const [addCost, setAddCost] = useState("");
  const [addAssignedTo, setAddAssignedTo] = useState("");
  const [addBarcode, setAddBarcode] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSerial, setEditSerial] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editBarcode, setEditBarcode] = useState("");
  const [editWarranty, setEditWarranty] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
    api<AssetRow[]>(`${API_CONFIG.endpoints.assets}${params}`)
      .then(setAssets)
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, [searchTerm]);

  useEffect(() => {
    api<UserOption[]>(API_CONFIG.endpoints.users.list)
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const filteredAssets = assets;
  const totalValue = filteredAssets.reduce((sum, a) => sum + (Number(a.cost_gross) || 0), 0);
  const formatDate = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "-");

  const handleDelete = async (assetId: number) => {
    if (!confirm("Da li ste sigurni da želite obrisati ovu stavku imovine?")) return;
    try {
      await api(API_CONFIG.endpoints.assetDelete(assetId), { method: "DELETE" });
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch {
      /* ignore */
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;
    setAddLoading(true);
    try {
      await api(API_CONFIG.endpoints.assets, {
        method: "POST",
        body: JSON.stringify({
          name: addName.trim(),
          serial_no: addSerial.trim() || null,
          location: addLocation.trim() || null,
          assigned_to: addAssignedTo ? parseInt(addAssignedTo, 10) : null,
          internal_barcode: addBarcode.trim() || null,
          cost_gross: addCost ? parseFloat(addCost) : null,
        }),
      });
      const list = await api<AssetRow[]>(API_CONFIG.endpoints.assets);
      setAssets(list);
      setShowAddModal(false);
      setAddName("");
      setAddSerial("");
      setAddLocation("");
      setAddCost("");
      setAddAssignedTo("");
      setAddBarcode("");
    } finally {
      setAddLoading(false);
    }
  };

  const openEditModal = (asset: AssetRow) => {
    setEditId(asset.id);
    setEditName(asset.name);
    setEditSerial(asset.serial_no || "");
    setEditLocation(asset.location || "");
    setEditAssignedTo(asset.assigned_to != null ? String(asset.assigned_to) : "");
    setEditBarcode(asset.internal_barcode || "");
    setEditWarranty(asset.warranty_until ? new Date(asset.warranty_until).toISOString().slice(0, 10) : "");
    setEditCost(asset.cost_gross != null ? String(asset.cost_gross) : "");
    setShowEditModal(true);
  };

  const handleEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId == null || !editName.trim()) return;
    setEditLoading(true);
    try {
      await api(API_CONFIG.endpoints.assetUpdate(editId), {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          serial_no: editSerial.trim() || null,
          location: editLocation.trim() || null,
          assigned_to: editAssignedTo ? parseInt(editAssignedTo, 10) : null,
          internal_barcode: editBarcode.trim() || null,
          warranty_until: editWarranty || null,
          cost_gross: editCost ? parseFloat(editCost) : null,
        }),
      });
      const list = await api<AssetRow[]>(API_CONFIG.endpoints.assets);
      setAssets(list);
      setShowEditModal(false);
      setEditId(null);
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Učitavanje imovine...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Upravljanje imovinom</h1>
          <p className="text-sm text-muted-foreground mt-1">Pregled i upravljanje IT opremom</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-foreground rounded-lg hover:bg-muted transition-colors">
            <Download className="w-4 h-4" strokeWidth={2} />
            Izvezi
          </button>
          <button
            onClick={() => { setAddAssignedTo(""); setAddBarcode(""); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Dodaj imovinu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Ukupno imovine</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{assets.length}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Aktivno</p>
          <p className="text-2xl font-semibold text-[--color-success] mt-1">{assets.length}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">U održavanju</p>
          <p className="text-2xl font-semibold text-[--color-warning] mt-1">0</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Ukupna vrijednost</p>
          <p className="text-2xl font-semibold text-foreground mt-1">€{totalValue.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
            <input
              type="text"
              placeholder="Pretraga po nazivu, serijskom broju, internom barkodu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Filter className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
        </div>
      </div>

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Naziv</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Serijski broj</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dodeljeno</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Interni barkod</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Lokacija</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Garantija do</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Vrijednost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-foreground">{asset.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-foreground">{asset.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground font-mono">{asset.serial_no || "-"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-foreground">{asset.assigned_to_name || "-"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-muted-foreground">{asset.internal_barcode || "-"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{asset.location || "-"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">{formatDate(asset.warranty_until)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-foreground">
                      {asset.cost_gross != null ? `€${Number(asset.cost_gross).toLocaleString()}` : "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap relative z-[50]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); openEditModal(asset); }}
                        onMouseDown={(e) => { e.stopPropagation(); }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted border border-border rounded-lg cursor-pointer transition-colors select-none"
                        title="Uredi"
                      >
                        <Pencil className="w-4 h-4" strokeWidth={2} />
                        Uredi
                      </button>
                      <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(asset.id); }}
                      onMouseDown={(e) => { e.stopPropagation(); }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 rounded-lg cursor-pointer transition-colors select-none"
                      title="Obriši"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2} />
                      Obriši
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Prikazano {filteredAssets.length} od {assets.length} stavki
        </p>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="font-semibold text-foreground mb-4">Dodaj imovinu</h3>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Naziv *</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="npr. MacBook Pro"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Serijski broj</label>
                <input
                  type="text"
                  value={addSerial}
                  onChange={(e) => setAddSerial(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Lokacija</label>
                <input
                  type="text"
                  value={addLocation}
                  onChange={(e) => setAddLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Zadužen (korisnik)</label>
                <select
                  value={addAssignedTo}
                  onChange={(e) => setAddAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— Niko —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Interni barkod</label>
                <input
                  type="text"
                  value={addBarcode}
                  onChange={(e) => setAddBarcode(e.target.value)}
                  placeholder="npr. INV-001"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Vrijednost (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={addCost}
                  onChange={(e) => setAddCost(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {addLoading ? "Čeka..." : "Dodaj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editId != null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-foreground mb-4">Uredi imovinu</h3>
            <form onSubmit={handleEditAsset} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Naziv *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="npr. MacBook Pro"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Serijski broj</label>
                <input
                  type="text"
                  value={editSerial}
                  onChange={(e) => setEditSerial(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Lokacija</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Zadužen (korisnik)</label>
                <select
                  value={editAssignedTo}
                  onChange={(e) => setEditAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— Niko —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Interni barkod</label>
                <input
                  type="text"
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  placeholder="npr. INV-001"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Garantija do</label>
                <input
                  type="date"
                  value={editWarranty}
                  onChange={(e) => setEditWarranty(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Vrijednost (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditId(null); }}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {editLoading ? "Čeka..." : "Sačuvaj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
