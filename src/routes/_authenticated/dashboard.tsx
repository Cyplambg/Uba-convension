import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, FileText, Wallet, PiggyBank, Briefcase, CalendarCheck,
  TrendingUp, TrendingDown, AlertTriangle, Trophy, Plus, Download, FileBarChart,
} from "lucide-react";
import { MONTHS_FR } from "@/lib/months";
import { exportAnnualReport } from "@/lib/excel-export";
import { toast } from "sonner";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";


export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { role, profile } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  const { data } = useQuery({
    queryKey: ["dashboard", role, profile?.agency_id],
    queryFn: async () => {
      let q = supabase.from("conventions").select("cc, ce, pm, year, month, agency_id");
      if (role === "agent" && profile?.agency_id) q = q.eq("agency_id", profile.agency_id);
      const { data: convs } = await q;
      const { data: agencies } = await supabase.from("agencies").select("id, name, code");
      return { convs: convs ?? [], agencies: agencies ?? [] };
    },
  });

  const allRows = data?.convs ?? [];
  const agencies = data?.agencies ?? [];
  const agencyName = (id: string) => agencies.find((a) => a.id === id)?.name ?? "—";

  const availableYears = useMemo(
    () => Array.from(new Set([...allRows.map((r) => r.year), currentYear])).sort((a, b) => b - a),
    [allRows, currentYear],
  );

  const rows = allRows.filter((r) => r.year === year);
  const prevRows = allRows.filter((r) => r.year === year - 1);

  const sum = (rs: typeof rows) => {
    const cc = rs.reduce((s, r) => s + (r.cc ?? 0), 0);
    const ce = rs.reduce((s, r) => s + (r.ce ?? 0), 0);
    const pm = rs.reduce((s, r) => s + (r.pm ?? 0), 0);
    return { cc, ce, pm, total: cc + ce + pm };
  };
  const cur = sum(rows);
  const prev = sum(prevRows);
  const delta = prev.total ? ((cur.total - prev.total) / prev.total) * 100 : 0;

  const filled = new Set(rows.map((r) => r.month));
  const missing = MONTHS_FR.map((m, i) => ({ m, i: i + 1 })).filter((x) => !filled.has(x.i));

  // Monthly evolution
  const monthly = MONTHS_FR.map((m, i) => {
    const rs = rows.filter((r) => r.month === i + 1);
    const s = sum(rs);
    return { mois: m, CC: s.cc, CE: s.ce, PM: s.pm, Total: s.total };
  });

  // Répartition CC/CE/PM
  const pie = [
    { name: "CC", value: cur.cc, color: "var(--chart-2)" },
    { name: "CE", value: cur.ce, color: "var(--chart-3)" },
    { name: "PM", value: cur.pm, color: "var(--chart-4)" },
  ];

  // Classement des agences (admin only)
  const ranking = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      map.set(r.agency_id, (map.get(r.agency_id) ?? 0) + (r.cc ?? 0) + (r.ce ?? 0) + (r.pm ?? 0));
    });
    return Array.from(map.entries())
      .map(([id, total]) => ({ id, name: agencyName(id), total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [rows, agencies]);

  const stats = [
    { label: "Total conventions", value: cur.total, icon: FileText, tone: "bg-primary/10 text-primary" },
    { label: "Comptes Courants (CC)", value: cur.cc, icon: Wallet, tone: "bg-chart-2/10 text-chart-2" },
    { label: "Comptes Épargne (CE)", value: cur.ce, icon: PiggyBank, tone: "bg-chart-3/10 text-chart-3" },
    { label: "Personnes Morales (PM)", value: cur.pm, icon: Briefcase, tone: "bg-chart-4/10 text-chart-4" },
    { label: "Agences", value: agencies.length, icon: Building2, tone: "bg-chart-5/10 text-chart-5" },
    { label: "Mois renseignés", value: filled.size, icon: CalendarCheck, tone: "bg-primary/10 text-primary" },
  ];

  const generateBilan = () => {
    if (!rows.length) {
      toast.error(`Aucune donnée pour ${year}`);
      return;
    }
    const agencyIds = role === "agent" && profile?.agency_id
      ? [profile.agency_id]
      : Array.from(new Set(rows.map((r) => r.agency_id)));
    const payload = agencyIds.map((id) => {
      const a = agencies.find((x) => x.id === id);
      return {
        agencyId: id,
        agencyName: a?.name ?? "—",
        agencyCode: a?.code,
        rows: rows.filter((r) => r.agency_id === id).map((r) => ({
          month: r.month, cc: r.cc, ce: r.ce, pm: r.pm,
        })),
      };
    });
    exportAnnualReport({ year, agencies: payload });
    toast.success(`Bilan ${year} généré`);
  };

  return (

    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble en temps réel — année {year}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button asChild size="sm"><Link to="/saisie"><Plus className="mr-1 h-4 w-4" />Saisie</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/tableau"><Download className="mr-1 h-4 w-4" />Export</Link></Button>
          <Button size="sm" variant="secondary" onClick={generateBilan}>
            <FileBarChart className="mr-1 h-4 w-4" />Bilan annuel
          </Button>
        </div>
      </div>


      {/* Comparaison N vs N-1 */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4 shadow-card">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Évolution vs {year - 1}</div>
          <div className="mt-1 text-2xl font-black tabular-nums">
            {cur.total.toLocaleString("fr-FR")}
            <span className="ml-2 text-sm font-medium text-muted-foreground">contre {prev.total.toLocaleString("fr-FR")}</span>
          </div>
        </div>
        <div className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ${delta >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {delta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {prev.total ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%` : "—"}
        </div>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 shadow-card">
            <div className={`inline-grid h-9 w-9 place-items-center rounded-lg ${s.tone}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <div className="mt-3 text-2xl font-black tabular-nums">{s.value.toLocaleString("fr-FR")}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Alertes mois manquants */}
      {year === currentYear && missing.length > 0 && (
        <Card className="border-warning/40 bg-warning/5 p-4 shadow-card">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-warning/15 text-warning">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Données incomplètes</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {missing.length} mois non renseigné{missing.length > 1 ? "s" : ""} : {missing.map((x) => x.m).join(", ")}
              </div>
              <Button asChild size="sm" className="mt-3"><Link to="/saisie">Compléter maintenant</Link></Button>
            </div>
          </div>
        </Card>
      )}

      {/* Graphs */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 shadow-card lg:col-span-2">
          <div className="mb-3 font-semibold">Évolution mensuelle</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mois" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="Total" stroke="var(--primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="CC" stroke="var(--chart-2)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="CE" stroke="var(--chart-3)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="PM" stroke="var(--chart-4)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 shadow-card">
          <div className="mb-3 font-semibold">Répartition {year}</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {pie.map((p) => <Cell key={p.name} fill={p.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Classement + Suivi */}
      <div className="grid gap-4 lg:grid-cols-2">
        {role === "admin" && (
          <Card className="p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4 text-primary" /> Top agences {year}
            </div>
            {ranking.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Aucune donnée</div>
            ) : (
              <ol className="space-y-2">
                {ranking.map((r, idx) => {
                  const max = ranking[0].total || 1;
                  return (
                    <li key={r.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{idx + 1}</span>
                          {r.name}
                        </span>
                        <span className="tabular-nums font-semibold">{r.total.toLocaleString("fr-FR")}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${(r.total / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        )}

        <Card className={`p-4 shadow-card ${role !== "admin" ? "lg:col-span-2" : ""}`}>
          <div className="mb-3">
            <div className="font-semibold">Suivi de saisie — {year}</div>
            <div className="text-xs text-muted-foreground">
              État mensuel {role === "agent" ? "(votre agence)" : "(toutes agences)"}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
            {MONTHS_FR.map((m, i) => {
              const ok = filled.has(i + 1);
              return (
                <div key={m} className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${ok ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"}`}>
                  <span>{m}</span>
                  <span className={ok ? "text-success" : "text-warning"}>{ok ? "✓" : "✗"}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
