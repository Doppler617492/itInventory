import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Search, Filter, Upload, Eye, FileText, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface InvoiceRow {
  id: number;
  invoice_no: string;
  vendor_name: string | null;
  amount_net: number;
  amount_gross: number;
  vat_rate: number;
  invoice_date: string;
  status: string;
  request_code: string | null;
  has_document: boolean;
}

const statusDisplay: Record<string, string> = {
  RECEIVED: "Primljeno",
  MATCHED: "Upareno",
  CHECKED: "Provereno",
  APPROVED_FOR_PAYMENT: "Odobreno za plaćanje",
  PAID: "Plaćeno",
};

const statusColors: Record<string, string> = {
  RECEIVED: "bg-slate-100 text-slate-700",
  MATCHED: "bg-blue-100 text-blue-700",
  CHECKED: "bg-purple-100 text-purple-700",
  APPROVED_FOR_PAYMENT: "bg-[--color-success]/10 text-[--color-success]",
  PAID: "bg-emerald-100 text-emerald-700",
};

export function Finance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Sve");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "Sve") params.set("status", statusFilter);
    const qs = params.toString();
    api<InvoiceRow[]>(`${API_CONFIG.endpoints.invoices}${qs ? `?${qs}` : ""}`)
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const handleDelete = async (invoiceId: number) => {
    if (!confirm("Da li ste sigurni da želite obrisati ovaj račun?")) return;
    try {
      await api(API_CONFIG.endpoints.invoiceDelete(invoiceId), { method: "DELETE" });
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    } catch {
      // Ignore for now
    }
  };

  const handleMarkPaid = async (invoiceId: number) => {
    if (!confirm("Da li ste sigurni da želite označiti ovaj račun kao plaćen?")) return;
    try {
      await api(API_CONFIG.endpoints.invoiceMarkPaid(invoiceId), {
        method: "POST",
        body: JSON.stringify({ payment_method: "Plaćeno (ručnim unosom)" }),
      });
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, status: "PAID" } : inv
        )
      );
    } catch {
      // ignore for now
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      String(inv.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.vendor_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.invoice_no || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (d: string) => new Date(d).toISOString().slice(0, 10);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Učitavanje računa...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Financije i računi</h1>
          <p className="text-sm text-muted-foreground mt-1">Upravljanje računima</p>
        </div>
        <Link
          to="/finance/upload"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Upload className="w-4 h-4" strokeWidth={2} />
          Otpremi račun
        </Link>
      </div>

      <div className="bg-white border border-border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
            <input
              type="text"
              placeholder="Pretraga po ID, dobavljaču ili broju računa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="Sve">Sve</option>
              <option value="RECEIVED">Primljeno</option>
              <option value="MATCHED">Upareno</option>
              <option value="CHECKED">Provereno</option>
              <option value="APPROVED_FOR_PAYMENT">Odobreno za plaćanje</option>
              <option value="PAID">Plaćeno</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID računa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Broj računa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dobavljač</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Iznos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {invoice.has_document && <FileText className="w-4 h-4 text-muted-foreground" strokeWidth={2} />}
                      <span className="text-sm font-medium text-foreground">INV-{invoice.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">{invoice.invoice_no}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-foreground">{invoice.vendor_name || "-"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-foreground">€{Number(invoice.amount_net).toLocaleString()}</div>
                      <div className="text-muted-foreground text-xs">+€{(Number(invoice.amount_gross) - Number(invoice.amount_net)).toLocaleString()} PDV</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">{formatDate(invoice.invoice_date)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${statusColors[invoice.status] || "bg-slate-100 text-slate-700"}`}>
                      {statusDisplay[invoice.status] || invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Link to={`/finance/${invoice.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80">
                        <Eye className="w-4 h-4" strokeWidth={2} />
                        Pogledaj
                      </Link>
                      {invoice.status !== "PAID" && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMarkPaid(invoice.id); }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer transition-colors select-none"
                          title="Označi kao plaćeno"
                        >
                          Plaćeno
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(invoice.id); }}
                        onMouseDown={(e) => { e.stopPropagation(); }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 rounded-lg cursor-pointer transition-colors select-none relative z-[50]"
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
          Prikazano {filteredInvoices.length} od {invoices.length} računa
        </p>
      </div>
    </div>
  );
}
