import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Upload, X, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface Vendor { id: number; name: string }
interface Location { id: number; name: string }
interface Sector { id: number; name: string }
interface Approver { id: number; name: string; email: string; role: string }

interface RequestItemForm { name: string; qty: number; unit_price_net: string; vat_rate: string; discount_pct: string }

const defaultItem: RequestItemForm = { name: "", qty: 1, unit_price_net: "", vat_rate: "21", discount_pct: "" };

export function NewRequest() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignedApproverId, setAssignedApproverId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [store, setStore] = useState("");
  const [sector, setSector] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [items, setItems] = useState<RequestItemForm[]>([{ ...defaultItem }]);
  const [priority, setPriority] = useState("MEDIUM");

  const addItem = () => setItems((prev) => [...prev, { ...defaultItem }]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof RequestItemForm, value: string | number) => {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  const totalAmountNet = items.reduce((sum, it) => {
    const qty = it.qty || 0;
    const price = parseFloat(it.unit_price_net) || 0;
    const disc = (parseFloat(it.discount_pct) || 0) / 100;
    return sum + qty * price * (1 - disc);
  }, 0);
  const totalAmountGross = items.reduce((sum, it) => {
    const qty = it.qty || 0;
    const price = parseFloat(it.unit_price_net) || 0;
    const disc = (parseFloat(it.discount_pct) || 0) / 100;
    const vat = parseFloat(it.vat_rate) || 21;
    return sum + qty * price * (1 - disc) * (1 + vat / 100);
  }, 0);

  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAddSector, setShowAddSector] = useState(false);
  const [addVendorName, setAddVendorName] = useState("");
  const [addLocationName, setAddLocationName] = useState("");
  const [addSectorName, setAddSectorName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  const fetchData = () => {
    setDataLoading(true);
    setDataError("");
    Promise.all([
      api<Vendor[]>(API_CONFIG.endpoints.vendors),
      api<Location[]>(API_CONFIG.endpoints.locations),
      api<Sector[]>(API_CONFIG.endpoints.sectors),
    ]).then(([v, l, s]) => {
      setVendors(v || []);
      setLocations(l || []);
      setSectors(s || []);
    }).catch(() => {
      setDataError("Nije moguće učitati lokacije, sektore i dobavljače. Provjerite da li je API server pokrenut.");
    }).finally(() => setDataLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (store) params.set("store", store);
    if (sector) params.set("sector", sector);
    const q = params.toString();
    api<Approver[]>(API_CONFIG.endpoints.users.approvers + (q ? `?${q}` : ""))
      .then(setApprovers)
      .catch(() => setApprovers([]));
  }, [store, sector]);

  useEffect(() => {
    if (locations.length && !store) setStore(locations[0].name);
  }, [locations, store]);
  useEffect(() => {
    if (sectors.length && !sector) setSector(sectors[0].name);
  }, [sectors]);

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addVendorName.trim()) return;
    setAddLoading(true);
    try {
      const v = await api<Vendor>(API_CONFIG.endpoints.vendors, { method: "POST", body: JSON.stringify({ name: addVendorName.trim() }) });
      setVendors((prev) => [...prev, v]);
      setVendorId(String(v.id));
      setAddVendorName("");
      setShowAddVendor(false);
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addLocationName.trim()) return;
    setAddLoading(true);
    try {
      const loc = await api<Location>(API_CONFIG.endpoints.locations, { method: "POST", body: JSON.stringify({ name: addLocationName.trim() }) });
      setLocations((prev) => [...prev, loc]);
      setStore(loc.name);
      setAddLocationName("");
      setShowAddLocation(false);
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSectorName.trim()) return;
    setAddLoading(true);
    try {
      const sec = await api<Sector>(API_CONFIG.endpoints.sectors, { method: "POST", body: JSON.stringify({ name: addSectorName.trim() }) });
      setSectors((prev) => [...prev, sec]);
      setSector(sec.name);
      setAddSectorName("");
      setShowAddSector(false);
    } finally {
      setAddLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]);
  };
  const removeFile = (index: number) => setFiles(files.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(
      (it) => it.name.trim() && (it.qty || 0) > 0 && (parseFloat(it.unit_price_net) || 0) > 0
    );
    if (!title.trim() || !store || !sector || validItems.length === 0) return;
    setLoading(true);
    try {
      const payloadItems = validItems.map((it) => {
        const disc = (parseFloat(it.discount_pct) || 0) / 100;
        return {
          name: it.name.trim(),
          qty: it.qty || 1,
          unit_price_net: parseFloat(it.unit_price_net) || 0,
          vat_rate: parseFloat(it.vat_rate) || 21,
          discount_pct: parseFloat(it.discount_pct) || 0,
        };
      });
      const amountNetComputed = payloadItems.reduce(
        (s, it) => s + it.qty * it.unit_price_net * (1 - (it.discount_pct || 0) / 100),
        0
      );
      await api(API_CONFIG.endpoints.requests, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          store,
          sector,
          assigned_approver_id: assignedApproverId ? parseInt(assignedApproverId, 10) : null,
          vendor_id: vendorId ? parseInt(vendorId, 10) : null,
          amount_net: amountNetComputed,
          vat_rate: 21,
          priority,
          items: payloadItems,
        }),
      });
      navigate("/requests");
    } catch {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-muted-foreground">Učitavanje forme...</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
          <p>{dataError}</p>
          <button onClick={fetchData} className="mt-2 px-4 py-2 bg-destructive text-white rounded-lg text-sm">
            Pokušaj ponovo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/requests" className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Novi zahtjev za nabavku</h1>
          <p className="text-sm text-muted-foreground mt-1">Popunite detalje za novi zahtjev</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Osnovne informacije</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Naslov zahtjeva *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="npr. IT oprema - Februar 2025"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Opis</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Unesite detaljan opis..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Hitnost *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
              <option value="LOW">Niska</option>
              <option value="MEDIUM">Srednja</option>
              <option value="HIGH">Visoka</option>
              <option value="CRITICAL">Kritična</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Lokacija *</label>
              <div className="flex gap-2">
                <select
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  disabled={false}
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">{locations.length ? "Odaberi lokaciju" : "Nema lokacija – dodajte klikom na +"}</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setShowAddLocation(true)} className="px-3 py-2 border border-border rounded-lg hover:bg-muted" title="Dodaj novu lokaciju">
                  <Plus className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Pošalji na odobrenje</label>
              <select
                value={assignedApproverId}
                onChange={(e) => setAssignedApproverId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{approvers.length ? "Izaberi odobravatelja" : "Nema odobravatelja – dodajte u Podešavanja"}</option>
                {approvers.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Odabrani korisnik će primiti notifikaciju i email</p>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Sektor *</label>
              <div className="flex gap-2">
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">{sectors.length ? "Odaberi sektor" : "Nema sektora – dodajte klikom na +"}</option>
                  {sectors.map((sec) => (
                    <option key={sec.id} value={sec.name}>{sec.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setShowAddSector(true)} className="px-3 py-2 border border-border rounded-lg hover:bg-muted" title="Dodaj novi sektor">
                  <Plus className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Dobavljač</h3>
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Dobavljač</label>
            <div className="flex gap-2">
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Izaberite dobavljača</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowAddVendor(true)} className="px-3 py-2 border border-border rounded-lg hover:bg-muted" title="Dodaj novog dobavljača">
                <Plus className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Stavke / Uređaji</h3>
          <p className="text-sm text-muted-foreground mb-4">Dodajte jednu ili više stavki u jedan zahtjev</p>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex flex-wrap items-start gap-3 p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-muted-foreground mb-1">Naziv stavke</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(index, "name", e.target.value)}
                    placeholder="npr. MacBook Pro 16&quot; M3"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs text-muted-foreground mb-1">Količina</label>
                  <input
                    type="number"
                    min={1}
                    value={item.qty || ""}
                    onChange={(e) => updateItem(index, "qty", parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs text-muted-foreground mb-1">Cijena (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={item.unit_price_net}
                    onChange={(e) => updateItem(index, "unit_price_net", e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
                <div className="w-16">
                  <label className="block text-xs text-muted-foreground mb-1">PDV %</label>
                  <input
                    type="number"
                    min={0}
                    value={item.vat_rate}
                    onChange={(e) => updateItem(index, "vat_rate", e.target.value)}
                    placeholder="21"
                    className="w-full px-2 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs text-muted-foreground mb-1">Rabat %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={item.discount_pct}
                    onChange={(e) => updateItem(index, "discount_pct", e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    title="Opcioni rabat u postocima"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="mt-6 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  title="Ukloni stavku"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Dodaj stavku
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4 max-w-xs">
            <div>
              <span className="text-sm text-muted-foreground">Ukupno (bez PDV):</span>
              <p className="font-semibold text-foreground">€ {totalAmountNet.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Ukupno (sa PDV):</span>
              <p className="font-semibold text-foreground">€ {totalAmountGross.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Prilozi</h3>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" strokeWidth={2} />
              <p className="text-sm text-foreground mb-1">Prevucite fajlove ili kliknite</p>
            <p className="text-xs text-muted-foreground mb-3">PDF, PNG, JPG up to 10MB</p>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
            />
            <label htmlFor="file-upload" className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-white text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer">
              Izaberi fajlove
            </label>
          </div>
          {files.length > 0 && (
            <div className="space-y-2 mt-4">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button type="button" onClick={() => removeFile(index)} className="p-1 hover:bg-muted rounded transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Link to="/requests" className="px-6 py-2 border border-border bg-white text-foreground rounded-lg hover:bg-muted transition-colors">
            Otkaži
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Šaljem..." : "Pošalji zahtjev"}
          </button>
        </div>
      </form>

      {/* Modal: Dodaj dobavljača */}
      {showAddVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddVendor(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground mb-4">Dodaj novog dobavljača</h3>
            <form onSubmit={handleAddVendor} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Naziv *</label>
                <input
                  type="text"
                  required
                  value={addVendorName}
                  onChange={(e) => setAddVendorName(e.target.value)}
                  placeholder="npr. Nova firma d.o.o."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddVendor(false)} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted">Otkaži</button>
                <button type="submit" disabled={addLoading} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">{addLoading ? "Dodajem..." : "Dodaj"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dodaj lokaciju */}
      {showAddLocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddLocation(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground mb-4">Dodaj novu lokaciju</h3>
            <form onSubmit={handleAddLocation} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Naziv *</label>
                <input
                  type="text"
                  required
                  value={addLocationName}
                  onChange={(e) => setAddLocationName(e.target.value)}
                  placeholder="npr. Prodavnica - Nova"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddLocation(false)} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted">Otkaži</button>
                <button type="submit" disabled={addLoading} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">{addLoading ? "Dodajem..." : "Dodaj"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dodaj sektor */}
      {showAddSector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddSector(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground mb-4">Dodaj novi sektor</h3>
            <form onSubmit={handleAddSector} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Naziv *</label>
                <input
                  type="text"
                  required
                  value={addSectorName}
                  onChange={(e) => setAddSectorName(e.target.value)}
                  placeholder="npr. Novi sektor"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddSector(false)} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted">Otkaži</button>
                <button type="submit" disabled={addLoading} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">{addLoading ? "Dodajem..." : "Dodaj"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
