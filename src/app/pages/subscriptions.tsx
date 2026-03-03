import { useEffect, useState } from "react";
import { Search, Plus, AlertCircle, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface SubscriptionRow {
  id: number;
  name: string;
  vendor_name: string | null;
  plan: string | null;
  seats: number | null;
  billing_cycle: string;
  cost: number;
  currency: string;
  renewal_date: string | null;
  status: string;
}

const cycleDisplay: Record<string, string> = {
  MONTHLY: "Mesečno",
  YEARLY: "Godišnje",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  CANCELED: "bg-slate-100 text-slate-700",
};

interface Vendor { id: number; name: string }

export function Subscriptions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [renewals, setRenewals] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [addName, setAddName] = useState("");
  const [addVendorId, setAddVendorId] = useState("");
  const [addPlan, setAddPlan] = useState("");
  const [addSeats, setAddSeats] = useState("");
  const [addBillingCycle, setAddBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [addCost, setAddCost] = useState("");
  const [addRenewalDate, setAddRenewalDate] = useState("");

  useEffect(() => {
    api<Vendor[]>(API_CONFIG.endpoints.vendors).then(setVendors).catch(() => setVendors([]));
  }, []);

  useEffect(() => {
    api<SubscriptionRow[]>(API_CONFIG.endpoints.subscriptions)
      .then(setSubscriptions)
      .catch(() => setSubscriptions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api<SubscriptionRow[]>(`${API_CONFIG.endpoints.renewals}?days=30`)
      .then(setRenewals)
      .catch(() => setRenewals([]));
  }, []);

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const s = searchTerm.toLowerCase();
    return (
      sub.name.toLowerCase().includes(s) ||
      (sub.vendor_name || "").toLowerCase().includes(s) ||
      String(sub.id).includes(s)
    );
  });

  const totalMonthlyCost = subscriptions.reduce((sum, sub) => {
    return sum + (sub.billing_cycle === "MONTHLY" ? Number(sub.cost) : Number(sub.cost) / 12);
  }, 0);

  const formatDate = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "-");

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addVendorId || !addCost) {
      setAddError("Naziv, dobavljač i trošak su obavezni");
      return;
    }
    setAddLoading(true);
    setAddError("");
    try {
      await api(API_CONFIG.endpoints.subscriptions, {
        method: "POST",
        body: JSON.stringify({
          name: addName.trim(),
          vendor_id: parseInt(addVendorId, 10),
          plan: addPlan.trim() || null,
          seats: addSeats ? parseInt(addSeats, 10) : null,
          billing_cycle: addBillingCycle,
          cost: parseFloat(addCost),
          renewal_date: addRenewalDate || null,
        }),
      });
      const list = await api<SubscriptionRow[]>(API_CONFIG.endpoints.subscriptions);
      setSubscriptions(list);
      const renewalsList = await api<SubscriptionRow[]>(`${API_CONFIG.endpoints.renewals}?days=30`);
      setRenewals(renewalsList);
      setShowAddModal(false);
      setAddName("");
      setAddVendorId("");
      setAddPlan("");
      setAddSeats("");
      setAddBillingCycle("MONTHLY");
      setAddCost("");
      setAddRenewalDate("");
    } catch (err: unknown) {
      setAddError((err as { detail?: string })?.detail || "Greška pri dodavanju");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (subId: number) => {
    if (!confirm("Da li ste sigurni da želite obrisati ovu pretplatu?")) return;
    try {
      await api(API_CONFIG.endpoints.subscriptionDelete(subId), { method: "DELETE" });
      setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
      setRenewals((prev) => prev.filter((s) => s.id !== subId));
    } catch {
      /* ignore */
    }
  };

  const getDaysUntil = (d: string | null) => {
    if (!d) return null;
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Učitavanje pretplata...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Upravljanje pretplatama</h1>
          <p className="text-sm text-muted-foreground mt-1">Pregled mesečnih usluga</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Dodaj pretplatu
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Ukupno pretplata</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{subscriptions.length}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Mesečni trošak</p>
          <p className="text-2xl font-semibold text-foreground mt-1">€{totalMonthlyCost.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Godišnji trošak</p>
          <p className="text-2xl font-semibold text-foreground mt-1">€{(totalMonthlyCost * 12).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Istiće uskoro</p>
          <p className="text-2xl font-semibold text-[--color-warning] mt-1">{renewals.length}</p>
        </div>
      </div>

      {renewals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" strokeWidth={2} />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">Predstojeća obnove</h3>
              <div className="space-y-2">
                {renewals.map((sub) => {
                  const days = getDaysUntil(sub.renewal_date);
                  return (
                    <div key={sub.id} className="flex items-center justify-between text-sm">
                      <span className="text-amber-800">
                        {sub.name} - {sub.vendor_name}
                      </span>
                      <span className="font-medium text-amber-900">
                        {days !== null ? `${days} dana preostalo` : "-"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-border rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
          <input
            type="text"
            placeholder="Pretraga po ID, usluzi ili dobavljaču..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usluga</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dobavljač</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Mesečni trošak</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ciklus</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Obnova</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Korisnici</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSubscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-foreground">{sub.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-foreground">{sub.vendor_name || "-"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-foreground">
                      €{(sub.billing_cycle === "MONTHLY" ? Number(sub.cost) : Number(sub.cost) / 12).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">{cycleDisplay[sub.billing_cycle] || sub.billing_cycle}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">{formatDate(sub.renewal_date)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">{sub.seats ?? "—"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${statusColors[sub.status] || "bg-slate-100 text-slate-700"}`}>
                      {sub.status === "ACTIVE" ? "Aktivno" : sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap relative z-[50]">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(sub.id); }}
                      onMouseDown={(e) => { e.stopPropagation(); }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 rounded-lg cursor-pointer transition-colors select-none"
                      title="Obriši"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2} />
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
          Prikazano {filteredSubscriptions.length} od {subscriptions.length} pretplata
        </p>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-foreground mb-4">Dodaj pretplatu</h3>
            <form onSubmit={handleAddSubscription} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Naziv usluge *</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="npr. Microsoft 365"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Dobavljač *</label>
                <select
                  required
                  value={addVendorId}
                  onChange={(e) => setAddVendorId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Izaberite dobavljača</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Plan</label>
                <input
                  type="text"
                  value={addPlan}
                  onChange={(e) => setAddPlan(e.target.value)}
                  placeholder="npr. Business Basic"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Ciklus naplate</label>
                  <select
                    value={addBillingCycle}
                    onChange={(e) => setAddBillingCycle(e.target.value as "MONTHLY" | "YEARLY")}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="MONTHLY">Mesečno</option>
                    <option value="YEARLY">Godišnje</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Trošak (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addCost}
                    onChange={(e) => setAddCost(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Broj licenci</label>
                  <input
                    type="number"
                    min="1"
                    value={addSeats}
                    onChange={(e) => setAddSeats(e.target.value)}
                    placeholder="—"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Datum obnove</label>
                  <input
                    type="date"
                    value={addRenewalDate}
                    onChange={(e) => setAddRenewalDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
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
                  {addLoading ? "Čeka..." : "Dodaj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
