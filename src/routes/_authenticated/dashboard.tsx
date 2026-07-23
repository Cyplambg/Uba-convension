import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import {
  Building2, FileText, Wallet, PiggyBank, Briefcase, CalendarCheck, Target,
  TrendingUp, TrendingDown, AlertTriangle, Trophy, Plus, Download, FileBarChart, FileDown,
} from "lucide-react";
import { MONTHS_FR } from "@/lib/months";
import { exportAnnualReport } from "@/lib/excel-export";
import { downloadFile } from "@/lib/download";
import { toast } from "sonner";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";


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

  const [filterAgencyId, setFilterAgencyId] = useState<string>("");

  const availableYears = useMemo(
    () => Array.from(new Set([...allRows.map((r) => r.year), currentYear])).sort((a, b) => b - a),
    [allRows, currentYear],
  );

  const byAgency = (rs: typeof allRows, id: string) => !id ? rs : rs.filter((r) => r.agency_id === id);
  const rows = byAgency(allRows.filter((r) => r.year === year), filterAgencyId);
  const prevRows = byAgency(allRows.filter((r) => r.year === year - 1), filterAgencyId);

  const sum = (rs: typeof rows) => {
    const cc = rs.reduce((s, r) => s + (r.cc ?? 0), 0);
    const ce = rs.reduce((s, r) => s + (r.ce ?? 0), 0);
    const pm = rs.reduce((s, r) => s + (r.pm ?? 0), 0);
    return { cc, ce, pm, total: cc + ce + pm };
  };
  const cur = sum(rows);
  const prev = sum(prevRows);
  const delta = prev.total ? ((cur.total - prev.total) / prev.total) * 100 : 0;

  const uniqueAgenciesInYear = new Set(rows.map((r) => r.agency_id));
  const filledMonths = new Set(rows.map((r) => r.month));
  const missing = MONTHS_FR.map((m, i) => ({ m, i: i + 1 })).filter((x) => !filledMonths.has(x.i));

  const activeAgencies = role === "agent" && profile?.agency_id
    ? [profile.agency_id] : agencies.map((a) => a.id);
  const totalCells = activeAgencies.length * 12;
  const allYearRows = byAgency(allRows.filter((r) => r.year === year), filterAgencyId);
  const usedAgencies = filterAgencyId
    ? [filterAgencyId]
    : (role === "admin" ? agencies.map((a) => a.id) : [profile?.agency_id].filter(Boolean));
  const filledCells = new Set(usedAgencies.flatMap((aid) =>
    allYearRows.filter((r) => r.agency_id === aid).map((r) => `${aid}:${r.month}`)
  ));
  const completionPct = totalCells ? Math.round((filledCells.size / totalCells) * 100) : 0;

  // Monthly comparison N vs N-1
  const monthlyCompare = MONTHS_FR.map((m, i) => {
    const curM = byAgency(allRows.filter((r) => r.year === year && r.month === i + 1), filterAgencyId);
    const prevM = byAgency(allRows.filter((r) => r.year === year - 1 && r.month === i + 1), filterAgencyId);
    const cu = sum(curM);
    const pr = sum(prevM);
    return { mois: m.slice(0, 3), [year]: cu.total, [`${year - 1}`]: pr.total };
  });

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

  // Classement des agences avec tendance (admin only)
  const ranking = useMemo(() => {
    const computeAgencyTotal = (rs: typeof allRows, id: string) =>
      rs.filter((r) => r.agency_id === id).reduce((s, r) => s + (r.cc ?? 0) + (r.ce ?? 0) + (r.pm ?? 0), 0);

    const map = new Map<string, number>();
    rows.forEach((r) => {
      map.set(r.agency_id, (map.get(r.agency_id) ?? 0) + (r.cc ?? 0) + (r.ce ?? 0) + (r.pm ?? 0));
    });
    return Array.from(map.entries())
      .map(([id, total]) => {
        const prevTotal = computeAgencyTotal(allRows.filter((r) => r.year === year - 1), id);
        return { id, name: agencyName(id), total, prevTotal };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [rows, agencies, allRows, year]);

  // Objectifs mensuels (localStorage)
  const storageKey = `targets_${year}`;
  const defaultTargets = MONTHS_FR.map((_, i) => ({ month: i + 1, cc: 0, ce: 0, pm: 0 }));
  const [targets, setTargetsState] = useState<{ month: number; cc: number; ce: number; pm: number }[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : defaultTargets;
    } catch { return defaultTargets; }
  });
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [editTargets, setEditTargets] = useState(targets);

  const saveTargets = () => {
    localStorage.setItem(storageKey, JSON.stringify(editTargets));
    setTargetsState(editTargets);
    setTargetDialogOpen(false);
    toast.success("Objectifs enregistrés");
  };

  const dashboardRef = useRef<HTMLDivElement>(null);

  const exportPdf = async () => {
    const el = dashboardRef.current;
    if (!el) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "visible";
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      let heightLeft = pdfH;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfW, pdfH);
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft > 0) {
        position -= pdf.internal.pageSize.getHeight();
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfW, pdfH);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      const buffer = pdf.output("arraybuffer");
      downloadFile(new Uint8Array(buffer), `Tableau_de_bord_${year}.pdf`, "application/pdf");
    } finally {
      document.body.style.overflow = origOverflow;
    }
  };

  const stats = [
    { label: "Total conventions", value: cur.total, icon: FileText, tone: "bg-primary/10 text-primary" },
    { label: "Comptes Courants (CC)", value: cur.cc, icon: Wallet, tone: "bg-chart-2/10 text-chart-2" },
    { label: "Comptes Épargne (CE)", value: cur.ce, icon: PiggyBank, tone: "bg-chart-3/10 text-chart-3" },
    { label: "Personnes Morales (PM)", value: cur.pm, icon: Briefcase, tone: "bg-chart-4/10 text-chart-4" },
    { label: "Agences", value: filterAgencyId ? 1 : uniqueAgenciesInYear.size, icon: Building2, tone: "bg-chart-5/10 text-chart-5" },
    { label: "Mois renseignés", value: filledMonths.size, icon: CalendarCheck, tone: "bg-primary/10 text-primary" },
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

    <div ref={dashboardRef} className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
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
          {role === "admin" && (
            <Select value={filterAgencyId} onValueChange={setFilterAgencyId}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les agences</SelectItem>
                {agencies.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button asChild size="sm"><Link to="/saisie"><Plus className="mr-1 h-4 w-4" />Saisie</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/tableau"><Download className="mr-1 h-4 w-4" />Export</Link></Button>
          <Button size="sm" variant="secondary" onClick={generateBilan}>
            <FileBarChart className="mr-1 h-4 w-4" />Bilan annuel
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf}>
            <FileDown className="mr-1 h-4 w-4" />PDF
          </Button>
          {role === "admin" && !filterAgencyId && (
            <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost"><Target className="mr-1 h-4 w-4" />Objectifs</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Objectifs mensuels — {year}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  {MONTHS_FR.map((m, i) => {
                    const t = editTargets[i];
                    return (
                      <div key={m} className="rounded-md border p-3">
                        <div className="mb-2 text-sm font-semibold">{m}</div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px]">CC</Label>
                            <Input type="number" min={0} value={t.cc} onChange={(e) => {
                              const copy = [...editTargets];
                              copy[i] = { ...copy[i], cc: Number(e.target.value) || 0 };
                              setEditTargets(copy);
                            }} />
                          </div>
                          <div>
                            <Label className="text-[10px]">CE</Label>
                            <Input type="number" min={0} value={t.ce} onChange={(e) => {
                              const copy = [...editTargets];
                              copy[i] = { ...copy[i], ce: Number(e.target.value) || 0 };
                              setEditTargets(copy);
                            }} />
                          </div>
                          <div>
                            <Label className="text-[10px]">PM</Label>
                            <Input type="number" min={0} value={t.pm} onChange={(e) => {
                              const copy = [...editTargets];
                              copy[i] = { ...copy[i], pm: Number(e.target.value) || 0 };
                              setEditTargets(copy);
                            }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                  <Button onClick={saveTargets}>Enregistrer</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
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

      {/* Taux de complétion */}
      {role === "admin" && !filterAgencyId && (
        <Card className="p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-chart-4/10 text-chart-4">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Taux de complétion {year}</div>
                <div className="text-xl font-black tabular-nums">{completionPct}%</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{filledCells.size} / {totalCells} cellules renseignées</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${completionPct >= 80 ? "bg-success" : completionPct >= 50 ? "bg-warning" : "bg-destructive"}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </Card>
      )}

      {/* Objectifs mensuels */}
      {role === "admin" && !filterAgencyId && targets.some((t) => t.cc || t.ce || t.pm) && (
        <Card className="p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Target className="h-4 w-4 text-primary" /> Objectifs vs réalisé — {year}
          </div>
          <div className="grid gap-2">
            {MONTHS_FR.map((m, i) => {
              const t = targets[i];
              if (!t.cc && !t.ce && !t.pm) return null;
              const actual = monthly[i];
              const targetTotal = t.cc + t.ce + t.pm;
              const actualTotal = actual.Total;
              const pct = targetTotal ? Math.min(Math.round((actualTotal / targetTotal) * 100), 100) : 0;
              return (
                <div key={m}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{m}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {actualTotal.toLocaleString("fr-FR")} / {targetTotal.toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-success" : pct >= 70 ? "bg-warning" : "bg-destructive"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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

      {/* Graphiques */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 shadow-card lg:col-span-2">
          <div className="mb-3 font-semibold">Comparaison mensuelle — {year} vs {year - 1}</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCompare}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mois" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey={year} fill="var(--primary)" radius={[3, 3, 0, 0]} />
                <Bar dataKey={`${year - 1}`} fill="var(--muted-foreground)" radius={[3, 3, 0, 0]} opacity={0.5} />
              </BarChart>
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 shadow-card lg:col-span-2">
          <div className="mb-3 font-semibold">Évolution mensuelle — {year}</div>
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
                  const agencyDelta = r.prevTotal ? ((r.total - r.prevTotal) / r.prevTotal) * 100 : null;
                  return (
                    <li key={r.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{idx + 1}</span>
                          {r.name}
                        </span>
                        <span className="tabular-nums font-semibold">{r.total.toLocaleString("fr-FR")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${(r.total / max) * 100}%` }} />
                        </div>
                        {agencyDelta !== null && (
                          <span className={`ml-2 flex shrink-0 items-center gap-0.5 text-[10px] font-semibold ${agencyDelta >= 0 ? "text-success" : "text-destructive"}`}>
                            {agencyDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {agencyDelta > 0 ? "+" : ""}{agencyDelta.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        )}
      </div>

      {/* Tableau croisé Agence × Mois */}
      {role === "admin" && !filterAgencyId && (
        <Card className="p-4 shadow-card">
          <div className="mb-3">
            <div className="font-semibold">Tableau croisé — {year}</div>
            <div className="text-xs text-muted-foreground">Vue d'ensemble agence × mois</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="whitespace-nowrap px-2 py-1.5 text-left font-medium">Agence</th>
                  {MONTHS_FR.map((m, i) => (
                    <th key={i} className="w-8 px-1 py-1.5 text-center font-medium">{m.slice(0, 3)}</th>
                  ))}
                  <th className="w-10 px-2 py-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((a) => {
                  const agencyRows = allYearRows.filter((r) => r.agency_id === a.id);
                  const totals = sum(agencyRows);
                  return (
                    <tr key={a.id} className="border-b border-muted/30">
                      <td className="whitespace-nowrap px-2 py-1.5 font-medium">{a.name}</td>
                      {MONTHS_FR.map((_, mi) => {
                        const ok = filledCells.has(`${a.id}:${mi + 1}`);
                        return (
                          <td key={mi} className="px-1 py-1.5">
                            <div className={`mx-auto h-5 w-5 rounded-sm ${ok ? "bg-success/30 ring-1 ring-success/40" : "bg-destructive/15 ring-1 ring-destructive/30"}`} title={ok ? `Mois ${mi + 1} renseigné` : `Mois ${mi + 1} manquant`} />
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums font-semibold">{totals.total.toLocaleString("fr-FR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
