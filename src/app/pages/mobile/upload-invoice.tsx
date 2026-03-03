import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Camera, Upload, X } from "lucide-react";
import { api, apiFormData } from "@/lib/api";
import { API_CONFIG } from "@/lib/api-config";

interface Vendor { id: number; name: string }

export function MobileUploadInvoice() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Vendor[]>(API_CONFIG.endpoints.vendors).then(setVendors).catch(() => setVendors([]));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      const allowed = [".pdf", ".png", ".jpg", ".jpeg"];
      if (!allowed.includes(ext)) {
        setError("Dozvoljeni formati: PDF, slike");
        return;
      }
      setSelectedFile(file);
      setError("");
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !vendorId || !invoiceNo || !amount || !invoiceDate) {
      setError("Popunite sva obavezna polja");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const invRes = await api<{ id: number }>(API_CONFIG.endpoints.invoices, {
        method: "POST",
        body: JSON.stringify({
          vendor_id: parseInt(vendorId, 10),
          invoice_no: invoiceNo.trim(),
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

      navigate("/mobile/finance");
    } catch (err: unknown) {
      setError((err as { detail?: string })?.detail || "Greška pri otpremanju");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-white border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/mobile/finance" className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Otpremi račun</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {!selectedFile && (
          <div className="space-y-3">
            <div className="bg-white border border-border rounded-lg overflow-hidden">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                id="camera-input"
              />
              <label htmlFor="camera-input" className="flex items-center gap-4 p-4 cursor-pointer active:bg-slate-50">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Camera className="w-6 h-6 text-primary" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Uslikaj</p>
                  <p className="text-xs text-muted-foreground">Uslikaj račun kamerom</p>
                </div>
              </label>
            </div>
            <div className="bg-white border border-border rounded-lg overflow-hidden">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="flex items-center gap-4 p-4 cursor-pointer active:bg-slate-50">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Izaberi fajl</p>
                  <p className="text-xs text-muted-foreground">Izaberite sa uređaja</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {selectedFile && (
          <div className="bg-white border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Izabrani fajl</h3>
              <button type="button" onClick={handleRemoveFile} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
              </button>
            </div>
            {preview ? (
              <img src={preview} alt="Pregled" className="w-full rounded-lg border border-border" />
            ) : (
              <div className="aspect-[8.5/11] bg-slate-100 border border-border rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedFile && (
          <div className="bg-white border border-border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Detalji računa</h3>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Dobavljač *</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              >
                <option value="">Izaberite dobavljača</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Broj računa *</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Broj računa"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Iznos (€) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Datum *</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Napomene</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dodatne napomene..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                rows={2}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-[--color-destructive] bg-[--color-destructive]/10 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {selectedFile && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRemoveFile}
              className="flex-1 px-4 py-3 border border-border bg-white text-foreground rounded-lg font-medium"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? "Otpremanje..." : "Otpremi"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
