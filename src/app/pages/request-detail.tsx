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
  requester_id: number;
  requester_name: string | null;
  assigned_approver_id: number | null;
  vendor_id: number | null;
  vendor_name: string | null;
  amount_net: number;
  amount_gross: number;
  vat_rate: number;
  status: string;
  items: { id: number; name: string; qty: number; unit_price_net: number; discount_pct?: number | null; total_gross: number }[];
  approval_flow: { step: string; approver: string; status: string; date: string | null; comment: string | null }[];
  invoices?: LinkedInvoice[];
}

const statusLabels: Record<string, string> = {
  DRAFT: "Nacrt",
  PENDING: "Poslat na odobravanje",
  APPROVED: "Odobreno",
  REJECTED: "Nije odobreno",
  ORDERED: "Naručeno",
  DELIVERED: "Isporučeno",
  CLOSED: "Zatvoreno",
};

export function RequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState<RequestDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
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

  const isRequesterOrAdmin = isAdmin || (currentUserId != null && request?.requester_id === currentUserId);

  useEffect(() => {
    if (!id) return;
    api<RequestDetailData>(API_CONFIG.endpoints.requestDetail(id))
      .then(setRequest)
      .catch(() => setRequest(null))
      .finally(() => setLoading(false));
  }, [id]);

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
        body: JSON.stringify({ comment: comment || "Rejected" }),
      });
      const updated = await api<RequestDetailData>(API_CONFIG.endpoints.requestDetail(id));
      setRequest(updated);
      setComment("");
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
        setUploadError("Format nije dozvoljen. Koristite: PDF, slike, Word, Excel.");
        setUploadFile(null);
      }
    }
  };

  const handleMarkPaid = async (invoiceId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMarkingPaidId(invoiceId);
    try {
      await api(API_CONFIG.endpoints.invoiceMarkPaid(invoiceId), {
        method: "POST",
        body: JSON.stringify({ payment_method: "Ručno" }),
      });
      const updated = await api<RequestDetailData>(API_CONFIG.endpoints.requestDetail(id!));
      setRequest(updated);
    } catch {
      /* ignore */
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleUploadInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !uploadFile || !uploadInvoiceNo.trim() || !uploadDate) {
      setUploadError("Popunite broj računa, datum i izaberite fajl");
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
      <div className="p-6">
        <p className="text-muted-foreground">{loading ? "Učitavanje..." : "Zahtjev nije pronađen"}</p>
      </div>
    );
  }

  const vatAmount = Number(request.amount_gross) - Number(request.amount_net);

  return (
    <div className="p-6 space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/requests" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{request.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">ID zahtjeva: {request.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <Link
              to={`/requests/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium"
            >
              <Pencil className="w-4 h-4" strokeWidth={2} />
              Izmijeni
            </Link>
          )}
        <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${
          request.status === "PENDING" ? "bg-amber-100 text-amber-700" :
          request.status === "APPROVED" ? "bg-green-100 text-green-700" :
          request.status === "REJECTED" ? "bg-red-100 text-red-700" :
          "bg-slate-100 text-slate-700"
        }`}>
          {statusLabels[request.status] || request.status}
        </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white border border-border rounded-lg p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Informacije o zahtjevu</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Opis</label>
                  <p className="text-sm text-foreground mt-1">{request.description || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Lokacija</label>
                    <p className="text-sm text-foreground mt-1">{request.store}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Sektor</label>
                    <p className="text-sm text-foreground mt-1">{request.sector || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="font-semibold text-foreground mb-4">Financijski detalji</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Iznos (bez PDV)</span>
                  <span className="text-sm font-medium text-foreground">€{Number(request.amount_net).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">PDV</span>
                  <span className="text-sm font-medium text-foreground">€{vatAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">Ukupno</span>
                  <span className="text-lg font-semibold text-primary">€{Number(request.amount_gross).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {request.items && request.items.length > 0 && (
            <div className="bg-white border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-4">Stavke</h3>
              <div className="space-y-2">
                {request.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start p-3 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name} × {item.qty}</p>
                      {(item.discount_pct != null && Number(item.discount_pct) > 0) && (
                        <p className="text-xs text-muted-foreground mt-0.5">Rabat: {Number(item.discount_pct)}%</p>
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">€{Number(item.total_gross).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-border rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-6">Tok odobrenja</h3>
            <div className="relative">
              {request.approval_flow?.map((step, index) => (
                <div key={index} className="flex gap-4 pb-8 last:pb-0">
                  {index < (request.approval_flow?.length || 1) - 1 && (
                    <div className="absolute left-5 top-12 w-0.5 h-full bg-border" />
                  )}
                  <div className="relative z-10">
                    {step.status === "approved" ? (
                      <div className="w-10 h-10 bg-[--color-success] rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                      </div>
                    ) : step.status === "rejected" ? (
                      <div className="w-10 h-10 bg-[--color-destructive] rounded-full flex items-center justify-center">
                        <X className="w-5 h-5 text-white" strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 border-2 border-border rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{step.step}</p>
                        <p className="text-sm text-muted-foreground">{step.approver}</p>
                      </div>
                      {step.date && (
                        <span className="text-xs text-muted-foreground">{step.date}</span>
                      )}
                    </div>
                    {step.comment && (
                      <div className="mt-2 p-3 bg-slate-50 border border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">{step.comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-border rounded-lg p-5">
            <h3 className="font-semibold text-foreground mb-4">Podnosioc</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Ime</label>
                <p className="text-sm text-foreground mt-0.5">{request.requester_name || "-"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-lg p-5">
            <h3 className="font-semibold text-foreground mb-4">Dobavljač</h3>
            <p className="text-sm text-foreground">{request.vendor_name || "-"}</p>
          </div>

          {request.invoices && request.invoices.length > 0 && (
            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" strokeWidth={2} />
                Prateća dokumentacija
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Računi / predračuni povezani sa ovim zahtjevom</p>
              <div className="space-y-2">
                {request.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-slate-50/50 transition-colors gap-3"
                  >
                    <Link
                      to={`/finance/${inv.id}`}
                      className="flex-1 min-w-0 flex items-center gap-2"
                    >
                      <span className="text-sm font-medium text-foreground">{inv.invoice_no}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                        {inv.doc_type === "PROFORMA" ? "Predračun" : "Račun"}
                      </span>
                      {inv.status === "PAID" && (
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">
                          Plaćeno
                        </span>
                      )}
                      {inv.invoice_date && (
                        <span className="text-xs text-muted-foreground shrink-0">{inv.invoice_date.slice(0, 10)}</span>
                      )}
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={2} />
                    </Link>
                    {inv.status !== "PAID" && isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkPaid(inv.id, e)}
                        disabled={markingPaidId === inv.id}
                        className="shrink-0 px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-md transition-colors disabled:opacity-50"
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
            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" strokeWidth={2} />
                Račun / Predračun
              </h3>
              <p className="text-sm text-muted-foreground mb-4">Otpremite račun ili predračun koji ide direktno u sektor Financije.</p>
              {uploadSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                  Račun je otpremljen u Financije.
                </div>
              )}
              <form onSubmit={handleUploadInvoice} className="space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Tip</label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value as "INVOICE" | "PROFORMA")}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  >
                    <option value="INVOICE">Račun</option>
                    <option value="PROFORMA">Predračun</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Broj računa *</label>
                  <input
                    type="text"
                    value={uploadInvoiceNo}
                    onChange={(e) => setUploadInvoiceNo(e.target.value)}
                    placeholder="npr. INV-2024-001"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Datum *</label>
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Fajl *</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      id="invoice-file"
                    />
                    <label htmlFor="invoice-file" className="cursor-pointer flex flex-col items-center gap-1">
                      <Upload className="w-6 h-6 text-muted-foreground" strokeWidth={2} />
                      <span className="text-sm">{uploadFile ? uploadFile.name : "Kliknite da izaberete fajl"}</span>
                    </label>
                  </div>
                </div>
                {uploadError && <p className="text-sm text-[--color-destructive]">{uploadError}</p>}
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
                >
                  {uploadLoading ? "Otpremanje..." : "Otpremi u Financije"}
                </button>
              </form>
            </div>
          )}

          {request.status === "DRAFT" && isRequesterOrAdmin && (
            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="font-semibold text-foreground mb-4">Pošalji zahtjev</h3>
              <p className="text-sm text-muted-foreground mb-4">Pošaljite zahtjev da započne tok odobrenja.</p>
              <button
                onClick={handleSubmit}
                disabled={actionLoading}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {actionLoading ? "Šaljem..." : "Pošalji na odobrenje"}
              </button>
            </div>
          )}

          {canApproveOrReject && (
            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="font-semibold text-foreground mb-4">Preduzmi akciju</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Dodaj komentar (obavezno za odbijanje)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Opcioni komentar za odobrenje..."
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" strokeWidth={2} />
                    Odobri
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={actionLoading || !comment}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                    Odbij
                  </button>
                </div>
                {!comment && (
                  <p className="text-xs text-muted-foreground">Odbijanje zahtjeva zahtijeva komentar</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Odobri/Odbij bar (kao na mobilnoj) */}
      {canApproveOrReject && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-lg">
          <div className="max-w-4xl mx-auto p-4 flex flex-col sm:flex-row gap-3 items-stretch">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Komentar (obavezan za odbijanje)..."
              className="flex-1 min-h-[60px] px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={2}
            />
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
              >
                <Check className="w-5 h-5" strokeWidth={2} />
                Odobri
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading || !comment}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
              >
                <X className="w-5 h-5" strokeWidth={2} />
                Odbij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
