import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  TrendingUp,
  Clock,
  RefreshCw,
  AlertCircle,
  Plus,
  Upload,
  DollarSign,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api, fetchMe } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface DashboardData {
  monthly_spend: number;
  pending_approvals: number;
  active_subscriptions: number;
  sub_monthly_cost: number;
  unpaid_invoices_count: number;
  unpaid_invoices_total: number;
  chart_monthly: { month: string; amount: number }[];
  chart_by_category: { name: string; value: number; color: string }[];
  chart_by_store: { store: string; cost: number }[];
}

const fallbackData: DashboardData = {
  monthly_spend: 0,
  pending_approvals: 0,
  active_subscriptions: 0,
  sub_monthly_cost: 0,
  unpaid_invoices_count: 0,
  unpaid_invoices_total: 0,
  chart_monthly: [
    { month: "Jan", amount: 0 },
    { month: "Feb", amount: 0 },
    { month: "Mar", amount: 0 },
    { month: "Apr", amount: 0 },
    { month: "May", amount: 0 },
    { month: "Jun", amount: 0 },
  ],
  chart_by_category: [
    { name: "Hardver", value: 0, color: "#1E3A8A" },
    { name: "Softver", value: 0, color: "#16A34A" },
    { name: "Usluge", value: 0, color: "#F59E0B" },
    { name: "Ostalo", value: 0, color: "#8b5cf6" },
  ],
  chart_by_store: [],
};

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchMe().then((u) => setIsAdmin(u.role === "ADMIN")).catch(() => setIsAdmin(false));
  }, []);

  const loadDashboard = () => {
    setLoading(true);
    setApiError(false);
    api<DashboardData>(API_CONFIG.dashboard)
      .then((d) => {
        setData(d);
        setApiError(false);
      })
      .catch(() => {
        setData(fallbackData);
        setApiError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const d = data || fallbackData;
  const hasCategoryData = d.chart_by_category?.some((c) => (c.value || 0) > 0);
  const hasStoreData = d.chart_by_store?.some((s) => (s.cost || 0) > 0);
  const monthlySpendData = d.chart_monthly?.length ? d.chart_monthly : fallbackData.chart_monthly;
  const categoryData = hasCategoryData ? d.chart_by_category : fallbackData.chart_by_category;
  const storeData = hasStoreData ? (d.chart_by_store || []).filter((s) => (s.cost || 0) > 0) : [{ store: "Nema podataka", cost: 0 }];

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Učitavanje kontrolne table...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {apiError && (
        <div className="bg-[--color-warning]/10 border border-[--color-warning]/30 rounded-lg p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-foreground">
            Nije moguće učitati podatke sa servera. Prikazani su prazni podaci.
          </p>
          <button
            onClick={loadDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-[--color-warning] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
            Pokušaj ponovo
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Kontrolna tabla</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pregled IT nabavke i financija
          </p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <Link
              to="/requests/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Novi zahtjev
            </Link>
          )}
          <Link
            to="/finance"
            className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <Upload className="w-4 h-4" strokeWidth={2} />
            Otpremi račun
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-border rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mesečni trošak</p>
                <p className="text-2xl font-semibold text-foreground mt-1">
                  €{d.monthly_spend.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <span className="text-muted-foreground">Ovaj mesec</span>
          </div>
        </div>

        <Link
          to="/requests?status=PENDING"
          className="bg-white border border-border rounded-lg p-5 block hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[--color-warning]/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-[--color-warning]" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Na čekanju odobrenja</p>
                <p className="text-2xl font-semibold text-foreground mt-1">
                  {d.pending_approvals}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <span className="text-primary font-medium">Klikni da odobriš ili odbiješ →</span>
          </div>
        </Link>

        <div className="bg-white border border-border rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[--color-success]/10 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-[--color-success]" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktivne pretplate</p>
                <p className="text-2xl font-semibold text-foreground mt-1">
                  {d.active_subscriptions}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <span className="text-muted-foreground">
              €{d.sub_monthly_cost.toLocaleString()} mesečno
            </span>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[--color-destructive]/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[--color-destructive]" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Neplaćeni računi</p>
                <p className="text-2xl font-semibold text-foreground mt-1">
                  {d.unpaid_invoices_count}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <span className="text-muted-foreground">
              €{d.unpaid_invoices_total.toLocaleString()} ukupno
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Mesečni trend troškova</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlySpendData}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: "12px" }} />
              <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#1E3A8A"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAmount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Troškovi po sektoru</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {categoryData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    €{item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cost by Store */}
      <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Troškovi po lokaciji</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={storeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="store" stroke="#64748b" style={{ fontSize: "12px" }} />
            <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
            <Tooltip />
            <Bar dataKey="cost" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
