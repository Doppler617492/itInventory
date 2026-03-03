import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, Check, X, Pencil, Upload, FileText, ExternalLink } from "lucide-react";
import { api, apiFormData, fetchMe } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface LinkedInvoice {
  id: number;
  invoice_no: string;
  doc_type: string;
  invoice_date: string | null;
  status: string;
}

interface RequestDetailData {
  id: number;
  code: string;
  title: string;
  description: string | null;
  store: string;
  sector: string | null;
  requester_id?: number;
  requester_name: string | null;
  assigned_approver_id: number | null;
  vendor_id: number | null;
  vendor_name: string | null;
  invoices?: LinkedInvoice[];
  amount_net: number;
  amount_gross: number;
  vat_rate: number;
  status: string;
  created_at: string;
  items: { id: number; name: string; qty: number; unit_price_net: number; discount_pct?: number | null; total_gross: number }[];
  approval_flow: { step: string; approver: string; status: string; date: string | null; comment: string | null }[];
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

export function MobileRequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState<RequestDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadInvoiceNo, setUploadInvoiceNo] = useState("");
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploadDocType, setUploadDocType] = useState<"INVOICE" | "PROFORMA">("INVOICE");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMarkPaid = async (invoiceId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMarkingPaidId(invoiceId);
    try {
      await api(API_CONFIG.endpoints.invoiceMarkPaid(invoiceId), {
        method: "POST",
        body: JSON.stringify({ payment_method: "Ručno" }),
      });
      if (id) {
        const updated = await api<RequestDetailData>(API_CONFIG.endpoints.requestDetail(id));
        setRequest(updated);
      }
    } catch {
      /* ignore */
    } finally {
      setMarkingPaidId(null);
    }
  };

  useEffect(() => {
    fetchMe().then((u) => {
      setCurrentUserId(u.id);
      setCurrentRole(u.role);
      setIsAdmin(u.role === "ADMIN");
    }).catch(() => {});
  }, []);

  const canApproveOrReject = request?.status === "PENDING" && (
    isAdmin ||
    (currentUserId != null && request.assigned_approver_id === currentUserId) ||
    (
      currentUserId != null &&
      !request.assigned_approver_id &&
      ["APPROVER", "MANAGER", "CEO"].includes(currentRole || "")
    )
  );

  const canEdit = request && (request.status === "DRAFT" || request.status === "PENDING") && (
    isAdmin || (currentUserId != null && request.requester_id === currentUserId)
  );

  useEffect(() => {
    if (!id) return;
    api<RequestDetailData>(API_CONFIG.endpoints.requestDetail(id))
      .then(setRequest)
      .catch(() => setRequest(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api(API_CONFIG.endpoints.requestApprove(id), {
        method: "POST",
        body: JSON.stringify({ comment: comment || null }),
      });
      const updated = await api<RequestDetailData>(API_CONFIG.endpoints.requestDetail(id));
      setRequest(updated);
      setComment("");
      setShowCommentBox(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api(API_CONFIG.endpoints.requestReject(id), {
        method: "POST",
        body: JSON.stringify({ comment: comment || "Odbijeno" }),
      });
      const updated = await api<RequestDetailData>(API_CONFIG.endpoints.requestDetail(id));
      setRequest(updated);
      setComment("");
      setShowCommentBox(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api(API_CONFIG.endpoints.requestSubmit(id), { method: "POST" });
      const updated = await api<RequestDetailData>(API_CONFIG.endpoints.requestDetail(id));
      setRequest(updated);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
      if ([".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".xls", ".xlsx"].includes(ext)) {
        setUploadFile(f);
        setUploadError("");
      } else {
        setUploadError("Format nije dozvoljen.");
        setUploadFile(null);
      }
    }
  };

  const handleUploadInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !uploadFile || !uploadInvoiceNo.trim() || !uploadDate) {
      setUploadError("Broj računa, datum i fajl su obavezni");
      return;
    }
    setUploadLoading(true);
    setUploadError("");
    setUploadSuccess(false);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("invoice_no", uploadInvoiceNo.trim());
      fd.append("invoice_date", uploadDate);
      fd.append("doc_type", uploadDocType);
      await apiFormData(API_CONFIG.endpoints.requestUploadInvoice(id), fd);
      setUploadSuccess(true);
      setUploadFile(null);
      setUploadInvoiceNo("");
      setUploadDate(new Date().toISOString().slice(0, 10));
      setUploadDocType("INVOICE");
      if (fileInputRef.current) fileInputRef.current.value = "";
      const updated = await api<RequestDetailData>(API_CONFIG.endpoints.requestDetail(id));
      setRequest(updated);
    } catch (err: unknown) {
      setUploadError((err as { detail?: string })?.detail || "Greška pri otpremanju");
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading || !request) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-sm">{loading ? "Učitavanje..." : "Zahtjev nije pronađen"}</p>
      </div>
    );
  }

  const vatAmount = Number(request.amount_gross) - Number(request.amount_net);
  const formatDate = (d: string) => new Date(d).toISOString().slice(0, 10);

  const isRequesterOrAdmin = isAdmin || (currentUserId != null && request?.requester_id === currentUserId);

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Link to="/mobile/requests" className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
          </Link>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-foreground">Detalji zahtjeva</h1>
            <p className="text-xs text-muted-foreground">{request.code}</p>
          </div>
          {canEdit && (
            <Link
              to={`/mobile/requests/${id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground bg-white"
            >
              <Pencil className="w-4 h-4" strokeWidth={2} />
              Izmijeni
            </Link>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${statusColor[request.status] || "bg-slate-100 text-slate-700"}`}>
            {statusLabel[request.status] || request.status}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white border border-border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-3">{request.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{request.description || "-"}</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Podnosioc</span>
              <span className="text-foreground font-medium">{request.requester_name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lokacija</span>
              <span className="text-foreground">{request.store}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sektor</span>
              <span className="text-foreground">{request.sector || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dobavljač</span>
              <span className="text-foreground">{request.vendor_name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Datum</span>
              <span className="text-foreground">{formatDate(request.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-3">Financijski detalji</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Iznos (bez PDV)</span>
              <span className="text-foreground font-medium">€{Number(request.amount_net).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PDV ({request.vat_rate}%)</span>
              <span className="text-foreground">€{vatAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold text-foreground">Ukupno</span>
              <span className="font-semibold text-primary">€{Number(request.amount_gross).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {request.approval_flow && request.approval_flow.length > 0 && (
          <div className="bg-white border border-border rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-4">Tok odobrenja</h3>
            <div className="space-y-4">
              {request.approval_flow.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1">
                    {step.status === "approved" ? (
                      <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                      </div>
                    ) : step.status === "rejected" ? (
                      <div className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center">
                        <X className="w-4 h-4 text-white" strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-slate-100 border-2 border-border rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{step.step}</p>
                    <p className="text-xs text-muted-foreground">{step.approver}</p>
                    {step.date && (
                      <p className="text-xs text-muted-foreground mt-0.5">{step.date}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {request.items && request.items.length > 0 && (
          <div className="bg-white border border-border rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-3">Stavke</h3>
            <div className="space-y-2">
              {request.items.map((item) => (
                <div key={item.id} className="flex justify-between p-2 border border-border rounded-lg text-sm">
                  <div>
                    <span className="text-foreground">{item.name} × {item.qty}</span>
                    {(item.discount_pct != null && Number(item.discount_pct) > 0) && (
                      <span className="block text-xs text-muted-foreground">Rabat: {Number(item.discount_pct)}%</span>
                    )}
                  </div>
                  <span className="font-medium">€{Number(item.total_gross).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {request.invoices && request.invoices.length > 0 && (
          <div className="bg-white border border-border rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" strokeWidth={2} />
              Prateća dokumentacija
            </h3>
            <div className="space-y-2">
              {request.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 border border-border rounded-lg gap-2">
                  <Link to={`/mobile/finance/${inv.id}`} className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{inv.invoice_no}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                      {inv.doc_type === "PROFORMA" ? "Predračun" : "Račun"}
                    </span>
                    {inv.status === "PAID" && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">
                        Plaćeno
                      </span>
                    )}
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={2} />
                  </Link>
                  {inv.status !== "PAID" && isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkPaid(inv.id, e)}
                      disabled={markingPaidId === inv.id}
                      className="shrink-0 px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-md"
                    >
                      {markingPaidId === inv.id ? "..." : "Plaćeno"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {request.vendor_id && isRequesterOrAdmin && (
          <div className="bg-white border border-border rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" strokeWidth={2} />
              Račun / Predračun
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Otpremite račun u Financije</p>
            {uploadSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs">
                Račun je otpremljen.
              </div>
            )}
            <form onSubmit={handleUploadInvoice} className="space-y-3">
              <select
                value={uploadDocType}
                onChange={(e) => setUploadDocType(e.target.value as "INVOICE" | "PROFORMA")}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              >
                <option value="INVOICE">Račun</option>
                <option value="PROFORMA">Predračun</option>
              </select>
              <input
                type="text"
                value={uploadInvoiceNo}
                onChange={(e) => setUploadInvoiceNo(e.target.value)}
                placeholder="Broj računa *"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              />
              <input
                type="date"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              />
              <div className="border-2 border-dashed border-border rounded-lg p-3 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  id="mobile-invoice-file"
                />
                <label htmlFor="mobile-invoice-file" className="cursor-pointer block">
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" strokeWidth={2} />
                  <span className="text-xs">{uploadFile ? uploadFile.name : "Izaberite fajl"}</span>
                </label>
              </div>
              {uploadError && <p className="text-xs text-[--color-destructive]">{uploadError}</p>}
              <button
                type="submit"
                disabled={uploadLoading}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 text-sm font-medium"
              >
                {uploadLoading ? "Otpremanje..." : "Otpremi u Financije"}
              </button>
            </form>
          </div>
        )}
      </div>

      {request.status === "DRAFT" && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-border p-4">
          <button
            onClick={handleSubmit}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
          >
            {actionLoading ? "Šaljem..." : "Pošalji na odobrenje"}
          </button>
        </div>
      )}

      {canApproveOrReject && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-border p-4 space-y-3">
          {showCommentBox && (
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Dodaj komentar (opciono za odobrenje; obavezno za odbijanje)..."
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
              rows={2}
            />
          )}
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={actionLoading || !comment}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-destructive text-white rounded-lg font-medium disabled:opacity-50"
            >
              <X className="w-4 h-4" strokeWidth={2} />
              Odbij
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-success text-white rounded-lg font-medium disabled:opacity-50"
            >
              <Check className="w-4 h-4" strokeWidth={2} />
              Odobri
            </button>
          </div>
          {!showCommentBox && (
            <button
              onClick={() => setShowCommentBox(true)}
              className="w-full text-sm text-primary"
            >
              Dodaj komentar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
