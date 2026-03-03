import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { login, ApiError } from "@/lib/api";

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirect, { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(
        typeof apiErr.detail === "string"
          ? apiErr.detail
          : "Prijava nije uspela. Proverite email i lozinku."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white border border-border rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            IT nabavka
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Prijavite se na nalog
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="vas@firma.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Lozinka</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="text-sm text-[--color-destructive] bg-[--color-destructive]/10 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
            >
              {loading ? "Prijava..." : "Prijavi se"}
            </button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground text-center">
            Demo: it@cungu.com / Dekodera1989@
          </p>
        </div>
        <p className="mt-4 text-center">
          <Link to="/welcome" className="text-sm text-primary hover:underline">
            Nazad na početnu
          </Link>
        </p>
      </div>
    </div>
  );
}
