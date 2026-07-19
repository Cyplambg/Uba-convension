import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { ArrowRight, ShieldCheck, Zap, BarChart3, Building2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/dashboard" />;

  const features = [
    { icon: ShieldCheck, title: "Saisie Sécurisée", desc: "Protocoles de sécurité bancaire pour la saisie confidentielle des données CC/CE/PM." },
    { icon: Zap, title: "Automatisation", desc: "Simplification des processus mensuels pour un gain de temps opérationnel immédiat." },
    { icon: BarChart3, title: "Reporting Clair", desc: "Visualisation précise des conventions par agence avec exports détaillés." },
    { icon: Building2, title: "Multi-Agences", desc: "Gestion centralisée pour l'ensemble du réseau UBA en temps réel." },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-6 md:px-12">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Zouane Conventions" className="h-10 w-auto object-contain" />
          <span className="font-bold tracking-tight text-slate-900">Zouane Conventions</span>
        </div>
        <Link to="/auth" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800">
          Connexion
        </Link>
      </header>

      <div className="flex items-start justify-center p-6 pt-8 md:p-12 md:pt-8">
        <div className="flex w-full max-w-6xl flex-col gap-12">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#B3191F] via-[#D32F2F] to-[#8E1418] px-8 py-16 text-white shadow-2xl md:px-16 md:py-24">
            <div className="absolute inset-0 opacity-10">
              <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <div className="relative z-10 max-w-2xl">
              <span className="mb-4 inline-block rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                Plateforme Officielle UBA
              </span>
              <h1
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="mb-6 text-5xl font-bold leading-tight md:text-7xl"
              >
                Zouane Conventions
              </h1>
              <p className="mb-10 text-lg leading-relaxed text-red-50 opacity-90 md:text-xl">
                Optimisez la saisie mensuelle des conventions CC, CE et PM pour toutes les agences. Une interface sécurisée conçue pour l'excellence bancaire.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/auth"
                  className="group flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-[#B3191F] transition-all hover:bg-slate-100 hover:shadow-lg"
                >
                  Commencer
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#features"
                  className="rounded-xl border border-white/30 px-8 py-4 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
                >
                  En savoir plus
                </a>
              </div>
            </div>
          </section>

          {/* Features */}
          <div id="features" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors group-hover:bg-red-600 group-hover:text-white">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-bold text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>

          <footer className="pb-4 pt-4 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Placy Rodnel DIMI MBONGO — Plateforme teste harchives UBA
          </footer>

        </div>
      </div>
    </div>
  );
}
