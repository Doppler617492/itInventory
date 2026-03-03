import { Link } from "react-router";
import { Monitor, Smartphone } from "lucide-react";

export function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            IT nabavka i financije
          </h1>
          <p className="text-muted-foreground">
            Sistem nabavke za maloprodajne kompanije
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            to="/"
            className="group bg-white border border-border rounded-lg p-8 hover:border-primary hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg mb-4 group-hover:bg-primary/20 transition-colors">
              <Monitor className="w-8 h-8 text-primary" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Desktop aplikacija
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Kontrolna tabla, upravljanje zahtjevima, financije i izvještaji.
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                <span>Kontrolna tabla i analitika</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                <span>Upravljanje zahtjevima</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                <span>Financije i računi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                <span>Imovina i pretplate</span>
              </div>
            </div>
          </Link>

          <Link
            to="/mobile"
            className="group bg-white border border-border rounded-lg p-8 hover:border-primary hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-success/10 rounded-lg mb-4 group-hover:bg-success/20 transition-colors">
              <Smartphone className="w-8 h-8 text-success" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Mobilna aplikacija
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Kreiraj zahtjeve, odobravaj, otpremaj račune kamerom.
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-success rounded-full" />
                <span>Pregled kontrolne table</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-success rounded-full" />
                <span>Kreiraj i odobri zahtjeve</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-success rounded-full" />
                <span>Uslikaj račun kamerom</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-success rounded-full" />
                <span>Prilagođen mobilnom</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Demo sistema za IT nabavku sa desktop i mobilnim interfejsom
          </p>
        </div>
      </div>
    </div>
  );
}
