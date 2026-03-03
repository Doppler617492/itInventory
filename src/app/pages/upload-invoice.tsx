import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { ArrowLeft, Upload, X } from "lucide-react";
import { api, apiFormData } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface Vendor { id: number; name: string }

export function UploadInvoice() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Vendor[]>(API_CONFIG.endpoints.vendors).then(setVendors).catch(() => setVendors([]));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      const allowed = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".xls", ".xlsx"];
      if (!allowed.includes(ext)) {
        setError("Neispravan format. Dozvoljeni: PDF, slike, Word, Excel");
        return;
      }
      setSelectedFile(file);
      setError("");
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !vendorId || !invoiceNo || !amount || !invoiceDate) {
      setError("Popunite sva polja i izaberite fajl");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const invRes = await api<{ id: number }>(API_CONFIG.endpoints.invoices, {
        method: "POST",
        body: JSON.stringify({
          vendor_id: parseInt(vendorId, 10),
          invoice_no: invoiceNo,
          invoice_date: invoiceDate,
          amount_net: parseFloat(amount) / 1.2,
          amount_gross: parseFloat(amount),
          vat_rate: 20,
        }),
      });

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("doc_type", "INVOICE");
      formData.append("invoice_id", String(invRes.id));
      await apiFormData(API_CONFIG.endpoints.documents.upload, formData);

      setSuccess(true);
      handleRemoveFile();
      setVendorId("");
      setInvoiceNo("");
      setAmount("");
      setInvoiceDate("");
    } catch (err: unknown) {
      setError((err as { detail?: string })?.detail || "Greška pri otpremanju");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/finance" className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Otpremi račun</h1>
          <p className="text-sm text-muted-foreground mt-1">Otpremite dokument i unesite detalje</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          Račun je uspešno otpremljen.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-border rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-4">Dokument</h3>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" strokeWidth={2} />
              <p className="text-sm text-foreground mb-1">Kliknite da izaberete fajl</p>
              <p className="text-xs text-muted-foreground">PDF, PNG, JPG, DOC, DOCX, XLS, XLSX</p>
            </label>
          </div>
          {selectedFile && (
            <div className="mt-4 flex items-center justify-between p-3 border border-border rounded-lg">
              <span className="text-sm">{selectedFile.name}</span>
              <button type="button" onClick={handleRemoveFile} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        <div className="bg-white border border-border rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Detalji računa</h3>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Dobavljač *</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Izaberite dobavljača</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          <div>
              <label className="block text-sm text-muted-foreground mb-2">Broj računa</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Broj računa"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Iznos (sa PDV)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Datum</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-[--color-destructive]">{error}</div>}

        <div className="flex gap-3">
          <Link to="/finance" className="px-6 py-2 border border-border rounded-lg hover:bg-muted">
            Otkaži
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Otpremanje..." : "Otpremi"}
          </button>
        </div>
      </form>
    </div>
  );
}
