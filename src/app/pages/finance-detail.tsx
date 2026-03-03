import { useEffect, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router";
import { ArrowLeft, Check, X, FileText, Download, ExternalLink, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface InvoiceDetail {
  id: number;
  invoice_no: string;
  vendor_name: string | null;
  vendor_address: string | null;
  vendor_pib: string | null;
  amount_net: number;
  amount_gross: number;
  vat_rate: number;
  invoice_date: string;
  status: string;
  request_id: number | null;
  request_code: string | null;
  payment_method: string | null;
  paid_at: string | null;
  has_document: boolean;
  document_id: number | null;
  document_mime: string | null;
  document_filename: string | null;
}

interface RequestOption { id: number; code: string; title: string }

const statusDisplay: Record<string, string> = {
  RECEIVED: "Primljeno",
  MATCHED: "Upareno",
  CHECKED: "Provereno",
  APPROVED_FOR_PAYMENT: "Odobreno za plaćanje",
  PAID: "Plaćeno",
};

export function FinanceDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = location.pathname.startsWith("/mobile");
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [requests, setRequests] = useState<RequestOption[]>([]);
  const [comment, setComment] = useState("");
  const [matchRequestId, setMatchRequestId] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<InvoiceDetail>(API_CONFIG.endpoints.invoiceDetail(id))
      .then(setInvoice)
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    api<{ id: number; code: string; title: string }[]>(API_CONFIG.endpoints.requests)
      .then((r) => setRequests(r))
      .catch(() => setRequests([]));
  }, []);

  useEffect(() => {
    if (!invoice?.has_document || !invoice?.document_id) return;
    const token = localStorage.getItem("access_token");
    let cancelled = false;
    let objectUrl: string | null = null;
    fetch(
      `${API_CONFIG.baseURL}${API_CONFIG.endpoints.documents.download(invoice.document_id)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
    };
  }, [invoice?.has_document, invoice?.document_id]);

  const handleSetStatus = async () => {
    if (!id || !newStatus) return;
    setActionLoading(true);
    try {
      await api(API_CONFIG.endpoints.invoiceSetStatus(id), {
        method: "POST",
        body: JSON.stringify({ status: newStatus }),
      });
      const updated = await api<InvoiceDetail>(API_CONFIG.endpoints.invoiceDetail(id));
      setInvoice(updated);
      setNewStatus("");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMatchRequest = async () => {
    if (!id || !matchRequestId) return;
    setActionLoading(true);
    try {
      await api(API_CONFIG.endpoints.invoiceMatch(id, matchRequestId), { method: "POST" });
      const updated = await api<InvoiceDetail>(API_CONFIG.endpoints.invoiceDetail(id));
      setInvoice(updated);
      setMatchRequestId("");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!id || !paymentMethod) return;
    setActionLoading(true);
    try {
      await api(API_CONFIG.endpoints.invoiceMarkPaid(id), {
        method: "POST",
        body: JSON.stringify({
          payment_method: paymentMethod,
          paid_at: paidDate || new Date().toISOString().slice(0, 19),
        }),
      });
      const updated = await api<InvoiceDetail>(API_CONFIG.endpoints.invoiceDetail(id));
      setInvoice(updated);
      setPaymentMethod("");
      setPaidDate("");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Da li ste sigurni da želite obrisati ovaj račun?")) return;
    setActionLoading(true);
    try {
      await api(API_CONFIG.endpoints.invoiceDelete(id), { method: "DELETE" });
      navigate(isMobile ? "/mobile/finance" : "/finance");
    } catch {
      /* ignore */
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!invoice?.document_id) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${API_CONFIG.baseURL}${API_CONFIG.endpoints.documents.download(invoice.document_id)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = invoice?.document_filename || "racun.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };

  const isPdf = (invoice?.document_mime || "").toLowerCase().includes("pdf");
  const isImage = ["image/png", "image/jpeg", "image/jpg", "image/gif"].includes(
    (invoice?.document_mime || "").toLowerCase()
  );
  const canPreview = isPdf || isImage;

  const formatDate = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "-");

  if (loading || !invoice) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{loading ? "Učitavanje..." : "Račun nije pronađen"}</p>
      </div>
    );
  }

  const vatAmount = Number(invoice.amount_gross) - Number(invoice.amount_net);
  const statusLabel = statusDisplay[invoice.status] || invoice.status;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={isMobile ? "/mobile/finance" : "/finance"} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Račun {invoice.invoice_no}</h1>
            <p className="text-sm text-muted-foreground mt-1">ID: {invoice.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-700">
          {statusLabel}
        </span>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); handleDelete(); }}
          disabled={actionLoading}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" strokeWidth={2} />
          Obriši
        </button>
      </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Pregled računa / predračuna</h3>
              {invoice.has_document && invoice.document_id && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" strokeWidth={2} />
                  Preuzmi
                </button>
              )}
            </div>
            <div className="aspect-[8.5/11] bg-slate-100 border border-border rounded-lg overflow-hidden min-h-[400px]">
              {invoice.has_document ? (
                previewUrl && canPreview ? (
                  isPdf ? (
                    <iframe
                      src={previewUrl}
                      title="Pregled računa"
                      className="w-full h-full min-h-[400px] border-0"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Pregled računa"
                      className="w-full h-full object-contain"
                    />
                  )
                ) : previewUrl && !canPreview ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6">
                    <FileText className="w-16 h-16 text-muted-foreground mb-3" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground mb-4">Pregled nije dostupan za ovaj format</p>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg"
                    >
                      <Download className="w-4 h-4" strokeWidth={2} />
                      Preuzmi dokument
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Učitavanje pregleda...</p>
                  </div>
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <FileText className="w-16 h-16 text-muted-foreground mb-3" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground">Nema priloženog dokumenta</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-border rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-4">Detalji računa</h3>
            <div className="space-y-6">
              <div className="border-t border-border pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Iznos (bez PDV)</span>
                    <span className="text-sm font-medium text-foreground">
                      €{Number(invoice.amount_net).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">PDV</span>
                    <span className="text-sm font-medium text-foreground">€{vatAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">Ukupno</span>
                    <span className="text-lg font-semibold text-primary">
                      €{Number(invoice.amount_gross).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-t border-border pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Datum računa</label>
                    <p className="text-sm text-foreground mt-1">{formatDate(invoice.invoice_date)}</p>
                  </div>
                </div>
              </div>
              {invoice.request_code && (
                <div className="border-t border-border pt-6">
                  <label className="text-sm text-muted-foreground mb-2 block">Povezani zahtjev</label>
                  <Link
                    to={`/requests/${invoice.request_id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                    <span className="text-sm font-medium text-foreground">{invoice.request_code}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" strokeWidth={2} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-border rounded-lg p-5">
            <h3 className="font-semibold text-foreground mb-4">Dobavljač</h3>
            <div>
              <p className="text-sm text-foreground">{invoice.vendor_name || "-"}</p>
            </div>
          </div>

          {invoice.status === "PAID" && invoice.payment_method && (
            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="font-semibold text-foreground mb-4">Informacije o plaćanju</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Način</label>
                  <p className="text-sm text-foreground mt-0.5">{invoice.payment_method}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Datum plaćanja</label>
                  <p className="text-sm text-foreground mt-0.5">{formatDate(invoice.paid_at)}</p>
                </div>
              </div>
            </div>
          )}

          {!invoice.request_id && (invoice.status === "RECEIVED" || invoice.status === "MATCHED") && (
            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="font-semibold text-foreground mb-4">Poveži sa zahtjevom</h3>
              <div className="space-y-4">
                <select
                  value={matchRequestId}
                  onChange={(e) => setMatchRequestId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="">Izaberi zahtjev</option>
                  {requests.map((r) => (
                    <option key={r.id} value={r.id}>{r.code} - {r.title}</option>
                  ))}
                </select>
                <button
                  onClick={handleMatchRequest}
                  disabled={!matchRequestId || actionLoading}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm"
                >
                  {actionLoading ? "Čeka..." : "Poveži"}
                </button>
              </div>
            </div>
          )}

          {(invoice.status === "MATCHED" || invoice.status === "CHECKED") && (
            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="font-semibold text-foreground mb-4">Promeni status</h3>
              <div className="space-y-4">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="">Izaberi status</option>
                  <option value="CHECKED">Provereno</option>
                  <option value="APPROVED_FOR_PAYMENT">Odobreno za plaćanje</option>
                </select>
                <button
                  onClick={handleSetStatus}
                  disabled={!newStatus || actionLoading}
                  className="w-full px-4 py-2 bg-[--color-success] text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
                >
                  {actionLoading ? "Čeka..." : "Primeni"}
                </button>
              </div>
            </div>
          )}

          {invoice.status !== "PAID" && (
            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="font-semibold text-foreground mb-4">Označi kao plaćeno</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Način plaćanja</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  >
                    <option value="">Izaberi način</option>
                    <option value="Bank Transfer">Bankovni transfer</option>
                    <option value="Credit Card">Kreditna kartica</option>
                    <option value="Check">Ček</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Datum plaćanja</label>
                  <input
                    type="date"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
                <button
                  onClick={handleMarkPaid}
                  disabled={!paymentMethod || actionLoading}
                  className="w-full px-4 py-2 bg-[--color-success] text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
                >
                  {actionLoading ? "Čeka..." : "Označi kao plaćeno"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
