import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Upload, FileText, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface InvoiceRow {
  id: number;
  invoice_no: string;
  vendor_name: string | null;
  amount_gross: number;
  invoice_date: string;
  status: string;
}

const statusLabel: Record<string, string> = {
  RECEIVED: "Primljeno",
  MATCHED: "Upareno",
  CHECKED: "Provereno",
  APPROVED_FOR_PAYMENT: "Odobreno",
  PAID: "Plaćeno",
};

const statusColor: Record<string, string> = {
  RECEIVED: "bg-slate-100 text-slate-700",
  MATCHED: "bg-blue-100 text-blue-700",
  CHECKED: "bg-purple-100 text-purple-700",
  APPROVED_FOR_PAYMENT: "bg-green-100 text-green-700",
  PAID: "bg-emerald-100 text-emerald-700",
};

export function MobileFinance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDelete = async (e: React.MouseEvent, invoiceId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Da li ste sigurni da želite obrisati ovaj račun?")) return;
    try {
      await api(API_CONFIG.endpoints.invoiceDelete(invoiceId), { method: "DELETE" });
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    api<InvoiceRow[]>(API_CONFIG.endpoints.invoices)
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredInvoices = invoices.filter(
    (inv) =>
      (inv.vendor_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(inv.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.invoice_no || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d: string) => new Date(d).toISOString().slice(0, 10);

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-foreground">Financije</h1>
          <Link
            to="/mobile/finance/upload"
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm"
          >
            <Upload className="w-4 h-4" strokeWidth={2} />
            Otpremi
          </Link>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
          <input
            type="text"
            placeholder="Pretraga računa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          />
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Učitavanje...</p>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="bg-white border border-border rounded-lg p-4 flex gap-3">
                <Link to={`/mobile/finance/${invoice.id}`} className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mt-0.5">
                      <FileText className="w-5 h-5 text-primary" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-0.5">
                        {invoice.vendor_name || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">{invoice.invoice_no}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ml-2 ${statusColor[invoice.status] || "bg-slate-100 text-slate-700"}`}>
                    {statusLabel[invoice.status] || invoice.status}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">{formatDate(invoice.invoice_date)}</span>
                  <span className="text-sm font-semibold text-foreground">€{Number(invoice.amount_gross).toLocaleString()}</span>
                </div>
                </Link>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(e, invoice.id); }}
                  className="shrink-0 p-3 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer border border-red-200"
                  title="Obriši"
                >
                  <Trash2 className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
