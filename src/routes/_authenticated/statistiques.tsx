import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MONTHS_FR, YEARS } from "@/lib/months";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/statistiques")({
  component: StatsPage,
});

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];
const CSS_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function StatsPage() {
  const { role, profile } = useAuth();
  const [year, setYear] = useState<number | "all">(new Date().getFullYear());
  const [agencyId, setAgencyId] = useState<string>("all");

  const { data: agencies } = useQuery({
    queryKey: ["agencies"],
    queryFn: async () => (await supabase.from("agencies").select("id, name, code").order("name")).data ?? [],
  });

  const { data: rows } = useQuery({
    queryKey: ["stats", role, profile?.agency_id],
    queryFn: async () => {
      let q = supabase.from("conventions").select("agency_id, year, month, cc, ce, pm");
      if (role === "agent" && profile?.agency_id) q = q.eq("agency_id", profile.agency_id);
      return (await q).data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return (rows ?? []).filter((r) =>
      (year === "all" || r.year === year) &&
      (agencyId === "all" || r.agency_id === agencyId)
    );
  }, [rows, year, agencyId]);

  const monthly = useMemo(() => {
    const arr = MONTHS_FR.map((m, i) => ({ mois: m.slice(0, 3), cc: 0, ce: 0, pm: 0, total: 0, _i: i + 1 }));
    filtered.forEach((r) => {
      const b = arr[r.month - 1];
      b.cc += r.cc; b.ce += r.ce; b.pm += r.pm; b.total += r.cc + r.ce + r.pm;
    });
    return arr;
  }, [filtered]);

  const byCategory = useMemo(() => {
    const cc = filtered.reduce((s, r) => s + r.cc, 0);
    const ce = filtered.reduce((s, r) => s + r.ce, 0);
    const pm = filtered.reduce((s, r) => s + r.pm, 0);
    return [
      { name: "CC", value: cc },
      { name: "CE", value: ce },
      { name: "PM", value: pm },
    ];
  }, [filtered]);

  const ranking = useMemo(() => {
    const map = new Map<string, number>();
    (rows ?? []).forEach((r) => {
      if (year !== "all" && r.year !== year) return;
      const total = r.cc + r.ce + r.pm;
      map.set(r.agency_id, (map.get(r.agency_id) ?? 0) + total);
    });
    const list = (agencies ?? []).map((a) => ({ name: a.name, total: map.get(a.id) ?? 0 }));
    return list.sort((a, b) => b.total - a.total);
  }, [rows, agencies, year]);

  const yearlyEvolution = useMemo(() => {
    const map = new Map<number, number>();
    (rows ?? []).forEach((r) => {
      if (agencyId !== "all" && r.agency_id !== agencyId) return;
      map.set(r.year, (map.get(r.year) ?? 0) + r.cc + r.ce + r.pm);
    });
    return [...map.entries()].sort(([a], [b]) => a - b).map(([y, t]) => ({ year: String(y), total: t }));
  }, [rows, agencyId]);

  const bilanGeneral = useMemo(() => {
    const totalCC = filtered.reduce((s, r) => s + r.cc, 0);
    const totalCE = filtered.reduce((s, r) => s + r.ce, 0);
    const totalPM = filtered.reduce((s, r) => s + r.pm, 0);
    const grandTotal = totalCC + totalCE + totalPM;
    
    const moyenneParMois = grandTotal / (filtered.length > 0 ? MONTHS_FR.length : 1);
    
    const moisMax = monthly.reduce((max, m) => m.total > max.total ? m : max, monthly[0] || { mois: "", total: 0 });
    const moisMin = monthly.reduce((min, m) => m.total < min.total && m.total > 0 ? m : min, monthly.find(m => m.total > 0) || { mois: "", total: 0 });
    
    const nbAgencesActives = new Set(filtered.map(r => r.agency_id)).size;
    
    return {
      totalCC,
      totalCE,
      totalPM,
      grandTotal,
      moyenneParMois,
      moisMax,
      moisMin,
      nbAgencesActives,
      pctCC: grandTotal > 0 ? (totalCC / grandTotal * 100) : 0,
      pctCE: grandTotal > 0 ? (totalCE / grandTotal * 100) : 0,
      pctPM: grandTotal > 0 ? (totalPM / grandTotal * 100) : 0,
    };
  }, [filtered, monthly]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">Statistiques</h1>
          <p className="text-sm text-muted-foreground">Analyse et comparaison des données</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div>
            <Label className="text-xs">Agence</Label>
            <Select value={agencyId} onValueChange={setAgencyId} disabled={role === "agent"}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {(agencies ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Année</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(v === "all" ? "all" : Number(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bilan Général Complet */}
      <Card className="p-6 shadow-card bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-gradient-primary" />
          <h2 className="text-xl font-black">Bilan Général Complet</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Global */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground">TOTAL GLOBAL</div>
            <div className="mt-1 text-3xl font-black text-primary">{bilanGeneral.grandTotal.toLocaleString("fr-FR")}</div>
            <div className="mt-2 text-xs text-muted-foreground">Conventions totales</div>
          </div>

          {/* CC */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground">CONVENTIONS CC</div>
            <div className="mt-1 text-2xl font-bold">{bilanGeneral.totalCC.toLocaleString("fr-FR")}</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${bilanGeneral.pctCC}%`, backgroundColor: CSS_COLORS[0] }} />
              </div>
              <span className="text-xs font-semibold tabular-nums">{bilanGeneral.pctCC.toFixed(1)}%</span>
            </div>
          </div>

          {/* CE */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground">CONVENTIONS CE</div>
            <div className="mt-1 text-2xl font-bold">{bilanGeneral.totalCE.toLocaleString("fr-FR")}</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${bilanGeneral.pctCE}%`, backgroundColor: CSS_COLORS[1] }} />
              </div>
              <span className="text-xs font-semibold tabular-nums">{bilanGeneral.pctCE.toFixed(1)}%</span>
            </div>
          </div>

          {/* PM */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground">CONVENTIONS PM</div>
            <div className="mt-1 text-2xl font-bold">{bilanGeneral.totalPM.toLocaleString("fr-FR")}</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${bilanGeneral.pctPM}%`, backgroundColor: CSS_COLORS[2] }} />
              </div>
              <span className="text-xs font-semibold tabular-nums">{bilanGeneral.pctPM.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Statistiques supplémentaires */}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-background/50 p-3 text-center">
            <div className="text-xs font-medium text-muted-foreground">Moyenne mensuelle</div>
            <div className="mt-1 text-xl font-bold">{Math.round(bilanGeneral.moyenneParMois).toLocaleString("fr-FR")}</div>
          </div>
          
          <div className="rounded-lg bg-background/50 p-3 text-center">
            <div className="text-xs font-medium text-muted-foreground">Meilleur mois</div>
            <div className="mt-1 text-lg font-bold">{bilanGeneral.moisMax.mois || "—"}</div>
            <div className="text-xs text-muted-foreground">{bilanGeneral.moisMax.total.toLocaleString("fr-FR")} conventions</div>
          </div>
          
          {role === "admin" && (
            <div className="rounded-lg bg-background/50 p-3 text-center">
              <div className="text-xs font-medium text-muted-foreground">Agences actives</div>
              <div className="mt-1 text-xl font-bold">{bilanGeneral.nbAgencesActives}</div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 shadow-card">
          <div className="mb-2 font-semibold">Répartition mensuelle</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mois" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="cc" name="CC" fill={CSS_COLORS[0]} radius={4} />
                <Bar dataKey="ce" name="CE" fill={CSS_COLORS[1]} radius={4} />
                <Bar dataKey="pm" name="PM" fill={CSS_COLORS[2]} radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 shadow-card">
          <div className="mb-2 font-semibold">Répartition CC / CE / PM</div>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {byCategory.map((_, i) => <Cell key={i} fill={CSS_COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 shadow-card lg:col-span-2">
          <div className="mb-2 font-semibold">Évolution annuelle</div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={yearlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="year" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="total" stroke={CSS_COLORS[0]} strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {role === "admin" && (
          <Card className="p-4 shadow-card lg:col-span-2">
            <div className="mb-3 font-semibold">Classement des agences {year !== "all" && `— ${year}`}</div>
            <div className="space-y-2">
              {ranking.map((a, i) => {
                const max = ranking[0]?.total || 1;
                const pct = (a.total / max) * 100;
                return (
                  <div key={a.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-black text-primary">{i + 1}</span>{a.name}</span>
                      <span className="tabular-nums font-semibold">{a.total.toLocaleString("fr-FR")}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {ranking.length === 0 && <div className="py-4 text-center text-sm text-muted-foreground">Aucune donnée</div>}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
