import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Search, Filter, Plus, Eye, Trash2 } from "lucide-react";
import { api, fetchMe } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface RequestRow {
  id: number;
  code: string;
  title: string;
  store: string;
  sector: string | null;
  requester_name: string | null;
  vendor_name: string | null;
  amount_net: number;
  amount_gross: number;
  vat_rate: number;
  status: string;
  created_at: string | null;
}

interface Location { id: number; name: string }
interface Sector { id: number; name: string }
interface Vendor { id: number; name: string }

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-[--color-warning]/10 text-[--color-warning]",
  APPROVED: "bg-[--color-success]/10 text-[--color-success]",
  REJECTED: "bg-[--color-destructive]/10 text-[--color-destructive]",
  ORDERED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-purple-100 text-purple-700",
  CLOSED: "bg-slate-100 text-slate-700",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Nacrt",
  PENDING: "Poslat na odobravanje",
  APPROVED: "Odobreno",
  REJECTED: "Nije odobreno",
  ORDERED: "Naručeno",
  DELIVERED: "Isporučeno",
  CLOSED: "Zatvoreno",
};

export function Requests() {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "Svi");
  const [storeFilter, setStoreFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchMe().then((u) => setIsAdmin(u.role === "ADMIN")).catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status) setStatusFilter(status);
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      api<Location[]>(API_CONFIG.endpoints.locations),
      api<Sector[]>(API_CONFIG.endpoints.sectors),
      api<Vendor[]>(API_CONFIG.endpoints.vendors),
    ]).then(([l, s, v]) => {
      setLocations(l || []);
      setSectors(s || []);
      setVendors(v || []);
    }).catch(() => {});
  }, []);

  const loadRequests = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "Svi") params.set("status", statusFilter);
    if (storeFilter) params.set("store", storeFilter);
    if (sectorFilter) params.set("sector", sectorFilter);
    if (vendorFilter) params.set("vendor_id", vendorFilter);
    if (fromDate) params.set("from_date", fromDate);
    if (toDate) params.set("to_date", toDate);
    if (appliedSearch.trim()) params.set("search", appliedSearch.trim());
    const qs = params.toString();
    api<RequestRow[]>(`${API_CONFIG.endpoints.requests}${qs ? `?${qs}` : ""}`)
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [statusFilter, storeFilter, sectorFilter, vendorFilter, fromDate, toDate, appliedSearch]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = requests.filter((req) => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const match =
        req.code.toLowerCase().includes(term) ||
        req.title.toLowerCase().includes(term) ||
        (req.vendor_name || "").toLowerCase().includes(term) ||
        (req.requester_name || "").toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map((r) => r.id)));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Da li ste sigurni da želite obrisati ovaj zahtjev?")) return;
    setDeleteLoading(true);
    try {
      await api(API_CONFIG.endpoints.requestDelete(id), { method: "POST" });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadRequests();
    } catch {
      setDeleteLoading(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Da li ste sigurni da želite obrisati ${ids.length} zahtjev(a)?`)) return;
    setDeleteLoading(true);
    try {
      await api(API_CONFIG.endpoints.requestsBulkDelete, {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      setSelectedIds(new Set());
      loadRequests();
    } catch {
      setDeleteLoading(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toISOString().slice(0, 10);
  };

  const applySearch = () => setAppliedSearch(searchTerm);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Učitavanje zahtjeva...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Zahtijevi za nabavku
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upravljanje i praćenje zahtjeva
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/requests/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Novi zahtjev
          </Link>
        )}
      </div>

      {/* Filtri */}
      <div className="bg-white border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
          <span className="text-sm font-medium text-foreground">Filteri</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
            <input
              type="text"
              placeholder="Pretraga (ID, naslov, dobavljač...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="Svi">Svi statusi</option>
            <option value="DRAFT">Nacrt</option>
            <option value="PENDING">Poslat na odobravanje</option>
            <option value="APPROVED">Odobreno</option>
            <option value="REJECTED">Nije odobreno</option>
            <option value="ORDERED">Naručeno</option>
            <option value="DELIVERED">Isporučeno</option>
            <option value="CLOSED">Zatvoreno</option>
          </select>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Sve lokacije</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.name}>{loc.name}</option>
            ))}
          </select>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Svi sektori</option>
            {sectors.map((sec) => (
              <option key={sec.id} value={sec.name}>{sec.name}</option>
            ))}
          </select>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Svi dobavljači</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Od"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Do"
            />
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <button
            onClick={applySearch}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Primijeni pretragu
          </button>
        </div>
      </div>

      {/* Bulk akcije */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <span className="text-sm font-medium text-foreground">
            Odabrano: {selectedIds.size} zahtjev(a)
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={deleteLoading}
            className="flex items-center gap-2 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" strokeWidth={2} />
            Obriši odabrano
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Poništi odabir
          </button>
        </div>
      )}

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-border">
              <tr>
                {isAdmin && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filteredRequests.length > 0 && selectedIds.size === filteredRequests.length}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID zahtjeva</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Naslov</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Lokacija</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Sektor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Podnosioc</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dobavljač</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Iznos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                  {isAdmin && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(request.id)}
                        onChange={() => toggleSelect(request.id)}
                        className="rounded border-border"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-foreground">{request.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-foreground">{request.title}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{request.store}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{request.sector || "-"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-foreground">{request.requester_name || "-"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-foreground">{request.vendor_name || "-"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-foreground">
                        €{Number(request.amount_gross).toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${statusColors[request.status] || "bg-slate-100 text-slate-700"}`}>
                      {statusLabels[request.status] || request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">{formatDate(request.created_at)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/requests/${request.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                      >
                        <Eye className="w-4 h-4" strokeWidth={2} />
                        Pogledaj
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(request.id)}
                          disabled={deleteLoading}
                          className="inline-flex items-center gap-1 text-sm text-destructive hover:text-destructive/80 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2} />
                          Obriši
                        </button>
                      )}
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
          Prikazano {filteredRequests.length} zahtjeva
        </p>
      </div>
    </div>
  );
}
