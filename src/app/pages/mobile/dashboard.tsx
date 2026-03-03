import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Plus, Upload, TrendingUp, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { api, fetchMe } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface DashboardData {
  monthly_spend: number;
  pending_approvals: number;
  active_subscriptions: number;
  unpaid_invoices_count: number;
}

interface RequestRow {
  id: number;
  code: string;
  title: string;
  amount_gross: number;
  status: string;
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

export function MobileDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    fetchMe()
      .then((u) => {
        setIsAdmin(u.role === "ADMIN");
        setRole(u.role || "");
      })
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    api<DashboardData>(API_CONFIG.dashboard)
      .then(setData)
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    api<RequestRow[]>(API_CONFIG.endpoints.requests)
      .then((r) => setRequests(r.slice(0, 5)))
      .catch(() => setRequests([]));
  }, []);

  const d = data || {
    monthly_spend: 0,
    pending_approvals: 0,
    active_subscriptions: 0,
    unpaid_invoices_count: 0,
  };

  return (
    <div className="min-h-screen">
      <div className="bg-primary text-white p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold">Pregled</h1>
            <p className="text-xs text-white/80 mt-0.5">IT nabavka</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">U</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {isAdmin && (
            <Link
              to="/mobile/requests/new"
              className="flex items-center justify-center gap-2 bg-white text-primary rounded-lg py-3 font-medium text-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Novi zahtjev
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/mobile/finance/upload"
              className="flex items-center justify-center gap-2 bg-white/20 text-white rounded-lg py-3 font-medium text-sm"
            >
              <Upload className="w-4 h-4" strokeWidth={2} />
              Otpremi račun
            </Link>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="bg-white border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mesečni trošak</p>
                <p className="text-xl font-semibold text-foreground mt-0.5">€{d.monthly_spend.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
        <Link
          to="/mobile/requests?status=PENDING"
          className="bg-white border border-border rounded-lg p-4 block active:bg-slate-50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Na čekanju odobrenja</p>
                <p className="text-xl font-semibold text-foreground mt-0.5">{d.pending_approvals}</p>
              </div>
            </div>
          </div>
          {d.pending_approvals > 0 && (
            <p className="text-xs text-primary font-medium mt-2">Odobri ili odbij →</p>
          )}
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-success" strokeWidth={2} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Pretplate</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">{d.active_subscriptions}</p>
          </div>
          <div className="bg-white border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-destructive" strokeWidth={2} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Neplaćeno</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">{d.unpaid_invoices_count}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Nedavni zahtijevi</h2>
          <Link to="/mobile/requests" className="text-xs text-primary">
            Svi
          </Link>
        </div>
        <div className="space-y-2">
          {requests.map((req) => (
            <Link
              key={req.id}
              to={`/mobile/requests/${req.id}`}
              className="block bg-white border border-border rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">{req.code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${statusColor[req.status] || "bg-slate-100 text-slate-700"}`}>
                  {statusLabel[req.status] || req.status}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">{req.title}</p>
              <p className="text-xs text-muted-foreground">€{Number(req.amount_gross).toLocaleString()}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
