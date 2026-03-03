import { useEffect, useState } from "react";
import { Download, Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface SpendData { key: string; total: number }
interface StoreRow { store: string; spend: number; count?: number }

export function Reports() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [groupBy, setGroupBy] = useState<"store" | "vendor" | "category">("store");
  const [spendData, setSpendData] = useState<SpendData[]>([]);
  const [vendorData, setVendorData] = useState<SpendData[]>([]);
  const [storeData, setStoreData] = useState<SpendData[]>([]);
  const [subsMonthly, setSubsMonthly] = useState<{ total_monthly: number; total_annual: number; subscription_count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
    Promise.all([
      api<{ data: SpendData[] }>(`${API_CONFIG.endpoints.reports.spend}?${params}&group_by=store`),
      api<{ data: SpendData[] }>(`${API_CONFIG.endpoints.reports.spend}?${params}&group_by=vendor`),
      api<{ data: SpendData[] }>(`${API_CONFIG.endpoints.reports.spend}?${params}&group_by=category`),
      api<{ total_monthly: number; total_annual: number; subscription_count: number }>(API_CONFIG.endpoints.reports.subscriptionsMonthly),
    ])
      .then(([storeRes, vendorRes, categoryRes, subs]) => {
        const store = storeRes?.data || [];
        const vendor = vendorRes?.data || [];
        const category = categoryRes?.data || [];
        setStoreData(store);
        setVendorData(vendor);
        setSpendData(groupBy === "store" ? store : groupBy === "vendor" ? vendor : category);
        setSubsMonthly(subs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fromDate, toDate, groupBy]);

  const totalSpend = spendData.reduce((s, d) => s + d.total, 0);
  const chartData = spendData.map((d) => ({ key: d.key, spend: d.total }));
  const vendorChartData = vendorData.map((d) => ({ key: d.key, total: d.total }));

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Učitavanje izvještaja...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Izvještaji i analitika</h1>
          <p className="text-sm text-muted-foreground mt-1">Financijski pregled i analiza troškova</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" strokeWidth={2} />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm"
            />
            <span className="text-muted-foreground">—</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "store" | "vendor" | "category")}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="store">Po lokaciji</option>
            <option value="vendor">Po dobavljaču</option>
            <option value="category">Po kategoriji</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            <Download className="w-4 h-4" strokeWidth={2} />
            Izvezi izvještaj
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Ukupni trošak (period)</p>
          <p className="text-2xl font-semibold text-foreground mt-1">€{totalSpend.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Prosječna vrijednost zahtjeva</p>
          <p className="text-2xl font-semibold text-foreground mt-1">
            €{spendData.length ? (totalSpend / spendData.length).toFixed(0) : "0"}
          </p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Mesečni trošak pretplata</p>
          <p className="text-2xl font-semibold text-foreground mt-1">
            €{subsMonthly?.total_monthly?.toLocaleString() ?? "0"}
          </p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Broj pretplata</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{subsMonthly?.subscription_count ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Mesečni trend troškova</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="key" stroke="#64748b" style={{ fontSize: "12px" }} />
              <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
              <Tooltip />
              <Line type="monotone" dataKey="spend" stroke="#1E3A8A" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Troškovi po dobavljaču</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={vendorChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" style={{ fontSize: "12px" }} />
              <YAxis dataKey="key" type="category" stroke="#64748b" style={{ fontSize: "12px" }} width={100} />
              <Tooltip />
              <Bar dataKey="total" fill="#1E3A8A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-border rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-4">Troškovi po lokaciji</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Lokacija</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ukupno (€)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">% ukupnog</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {storeData.map((row) => {
                const pct = totalSpend ? ((row.total / totalSpend) * 100).toFixed(1) : "0";
                return (
                  <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-foreground">{row.key}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-foreground">€{row.total.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm text-muted-foreground">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
