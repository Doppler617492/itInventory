import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Plus, Search, Filter } from "lucide-react";
import { api, fetchMe } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface RequestRow {
  id: number;
  code: string;
  title: string;
  store: string;
  sector: string | null;
  amount_gross: number;
  status: string;
  created_at: string;
}

const statusLabel: Record<string, string> = {
  DRAFT: "Nacrt",
  PENDING: "Poslat na odobravanje",
  APPROVED: "Odobreno",
  REJECTED: "Nije odobreno",
  ORDERED: "Naručeno",
  DELIVERED: "Isporučeno",
  CLOSED: "Zatvoreno",
};

const statusColor: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ORDERED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-purple-100 text-purple-700",
  CLOSED: "bg-slate-100 text-slate-700",
};

export function MobileRequests() {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const statusFilter = searchParams.get("status") || "";

  useEffect(() => {
    fetchMe()
      .then((u) => setCanCreate(u.role === "ADMIN"))
      .catch(() => setCanCreate(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (statusFilter) params.set("status", statusFilter);
    const qs = params.toString();
    const url = `${API_CONFIG.endpoints.requests}${qs ? `?${qs}` : ""}`;
    api<RequestRow[]>(url)
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [searchTerm, statusFilter]);

  const formatDate = (d: string) => new Date(d).toISOString().slice(0, 10);

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-foreground">Zahtijevi</h1>
          {canCreate && (
            <Link
              to="/mobile/requests/new"
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Novi
            </Link>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              strokeWidth={2}
            />
            <input
              type="text"
              placeholder="Pretraga zahtjeva..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="p-2 border border-border rounded-lg"
          >
            <Filter className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Učitavanje...</p>
        ) : (
          requests.map((request) => (
            <Link
              key={request.id}
              to={`/mobile/requests/${request.id}`}
              className="block bg-white border border-border rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {request.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {request.store}{request.sector ? ` • ${request.sector}` : ""}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ml-2 ${statusColor[request.status] || "bg-slate-100 text-slate-700"}`}
                >
                  {statusLabel[request.status] || request.status}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">{request.code}</span>
                <span className="text-sm font-semibold text-foreground">
                  €{Number(request.amount_gross).toLocaleString()}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
