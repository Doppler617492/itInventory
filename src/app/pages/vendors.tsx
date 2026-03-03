import { useEffect, useState } from "react";
import { Search, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface VendorRow {
  id: number;
  name: string;
  pib: string | null;
  address: string | null;
}

export function Vendors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addName, setAddName] = useState("");
  const [addPib, setAddPib] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    api<VendorRow[]>(API_CONFIG.endpoints.vendors)
      .then(setVendors)
      .catch(() => setVendors([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredVendors = vendors.filter((v) => {
    const s = searchTerm.toLowerCase();
    return (
      v.name.toLowerCase().includes(s) ||
      (v.pib || "").toLowerCase().includes(s) ||
      (v.address || "").toLowerCase().includes(s)
    );
  });

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      setAddError("Naziv je obavezan");
      return;
    }
    setAddLoading(true);
    setAddError("");
    try {
      const payload = {
        name: addName.trim(),
        pib: addPib.trim() || null,
        address: addAddress.trim() || null,
      };
      if (editingId == null) {
        await api<VendorRow>(API_CONFIG.endpoints.vendors, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await api<VendorRow>(API_CONFIG.endpoints.vendorUpdate(editingId), {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      const list = await api<VendorRow[]>(API_CONFIG.endpoints.vendors);
      setVendors(list);
      setShowAddModal(false);
      setEditingId(null);
      setAddName("");
      setAddPib("");
      setAddAddress("");
    } catch (err: unknown) {
      setAddError((err as { detail?: string })?.detail || "Greška pri dodavanju dobavljača");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteVendor = async (id: number) => {
    if (!confirm("Da li ste sigurni da želite obrisati ovog dobavljača?")) return;
    try {
      await api(API_CONFIG.endpoints.vendorDelete(id), { method: "DELETE" });
      setVendors((prev) => prev.filter((v) => v.id !== id));
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail || "Dobavljača nije moguće obrisati";
      alert(msg);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Učitavanje dobavljača...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dobavljači</h1>
          <p className="text-sm text-muted-foreground mt-1">Lista dobavljača i brza pretraga (autocomplete)</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setAddName("");
            setAddPib("");
            setAddAddress("");
            setAddError("");
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Dodaj dobavljača
        </button>
      </div>

      <div className="bg-white border border-border rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
          <input
            type="text"
            placeholder="Pretraga po nazivu, PIB ili adresi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Naziv
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  PIB
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Adresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-foreground">{v.name}</span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">{v.pib || "-"}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm text-muted-foreground">{v.address || "-"}</span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(v.id);
                        setAddName(v.name);
                        setAddPib(v.pib || "");
                        setAddAddress(v.address || "");
                        setAddError("");
                        setShowAddModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted border border-border rounded-lg cursor-pointer transition-colors select-none"
                    >
                      Uredi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVendor(v.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 rounded-lg cursor-pointer transition-colors select-none"
                    >
                      Obriši
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Prikazano {filteredVendors.length} od {vendors.length} dobavljača
        </p>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="font-semibold text-foreground mb-4">
              {editingId == null ? "Dodaj dobavljača" : "Uredi dobavljača"}
            </h3>
            <form onSubmit={handleSaveVendor} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Naziv *</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="npr. ABC d.o.o."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">PIB</label>
                <input
                  type="text"
                  value={addPib}
                  onChange={(e) => setAddPib(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Adresa</label>
                <input
                  type="text"
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddError(""); }}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {addLoading ? "Čeka..." : "Sačuvaj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

