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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Building2, FileText, Wallet, PiggyBank, Briefcase, CalendarCheck, Target,
  TrendingUp, TrendingDown, AlertTriangle, Trophy, Plus, Download, FileBarChart, FileDown, Settings2, Lightbulb, FileSpreadsheet, Image
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MONTHS_FR } from "@/lib/months";
import { exportAnnualReport } from "@/lib/excel-export";
import { exportAnnualReportPdf } from "@/lib/pdf-export";
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

  const [quarter, setQuarter] = useState<string>("all");
  const getQuarterMonths = (q: string) => {
    if (q === "Q1") return [1, 2, 3];
    if (q === "Q2") return [4, 5, 6];
    if (q === "Q3") return [7, 8, 9];
    if (q === "Q4") return [10, 11, 12];
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };
  const activeMonths = getQuarterMonths(quarter);

  const byAgency = (rs: typeof allRows, id: string) => !id ? rs : rs.filter((r) => r.agency_id === id);
  const rows = byAgency(allRows.filter((r) => r.year === year && activeMonths.includes(r.month)), filterAgencyId);
  const prevRows = byAgency(allRows.filter((r) => r.year === year - 1 && activeMonths.includes(r.month)), filterAgencyId);

  const sum = (rs: typeof rows) => {
    const cc = rs.reduce((s, r) => s + (r.cc ?? 0), 0);
    const ce = rs.reduce((s, r) => s + (r.ce ?? 0), 0);
    const pm = rs.reduce((s, r) => s + (r.pm ?? 0), 0);
    return { cc, ce, pm, total: cc + ce + pm };
  };
  const cur = sum(rows);
  const prev = sum(prevRows);
  const delta = prev.total ? ((cur.total - prev.total) / prev.total) * 100 : 0;
  const deltaCC = prev.cc ? ((cur.cc - prev.cc) / prev.cc) * 100 : 0;
  const deltaCE = prev.ce ? ((cur.ce - prev.ce) / prev.ce) * 100 : 0;
  const deltaPM = prev.pm ? ((cur.pm - prev.pm) / prev.pm) * 100 : 0;

  const uniqueAgenciesInYear = new Set(rows.map((r) => r.agency_id));
  const filledMonths = new Set(rows.map((r) => r.month));
  const displayMonths = MONTHS_FR.map((m, i) => ({ m, i: i + 1 })).filter(x => activeMonths.includes(x.i));
  const missing = displayMonths.filter((x) => !filledMonths.has(x.i));

  const activeAgencies = role === "agent" && profile?.agency_id
    ? [profile.agency_id] : agencies.map((a) => a.id);
  const totalCells = activeAgencies.length * displayMonths.length;
  const allYearRows = byAgency(allRows.filter((r) => r.year === year), filterAgencyId);
  const usedAgencies = filterAgencyId
    ? [filterAgencyId]
    : (role === "admin" ? agencies.map((a) => a.id) : [profile?.agency_id].filter(Boolean));
  const filledCells = new Set(usedAgencies.flatMap((aid) =>
    allYearRows.filter((r) => r.agency_id === aid).map((r) => `${aid}:${r.month}`)
  ));
  const completionPct = totalCells ? Math.round((filledCells.size / totalCells) * 100) : 0;

  // Monthly comparison N vs N-1
  const monthlyCompare = displayMonths.map(({ m, i }) => {
    const curM = byAgency(allRows.filter((r) => r.year === year && r.month === i), filterAgencyId);
    const prevM = byAgency(allRows.filter((r) => r.year === year - 1 && r.month === i), filterAgencyId);
    const cu = sum(curM);
    const pr = sum(prevM);
    return { mois: m.slice(0, 3), [year]: cu.total, [`${year - 1}`]: pr.total };
  });

  // Monthly evolution
  const monthly = displayMonths.map(({ m, i }) => {
    const rs = rows.filter((r) => r.month === i);
    const s = sum(rs);
    return { mois: m.slice(0, 3), CC: s.cc, CE: s.ce, PM: s.pm, Total: s.total };
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

  // Insights intelligents
  const insights = useMemo(() => {
    if (!rows.length) return [];
    const list = [];
    
    // Top product
    const products = [
      { name: "Comptes Courants", val: cur.cc },
      { name: "Comptes Épargne", val: cur.ce },
      { name: "Personnes Morales", val: cur.pm },
    ].sort((a, b) => b.val - a.val);
    if (products[0].val > 0) {
      list.push(`Les ${products[0].name} représentent votre produit phare sur cette période avec ${products[0].val.toLocaleString("fr-FR")} conventions.`);
    }

    // Trend
    if (cur.total > 0 && prev.total > 0) {
      if (delta > 5) list.push(`Excellente dynamique : la production globale est en hausse de ${delta.toFixed(1)}% par rapport à la même période l'année précédente.`);
      else if (delta < -5) list.push(`Attention : une baisse de ${Math.abs(delta).toFixed(1)}% est observée par rapport à l'année précédente.`);
      else list.push(`La production globale est stable par rapport à la même période l'année dernière (${delta > 0 ? "+" : ""}${delta.toFixed(1)}%).`);
    }

    // Top agency
    if (role === "admin" && !filterAgencyId && ranking.length > 0 && ranking[0].total > 0) {
       list.push(`L'agence de ${ranking[0].name} est la plus performante avec ${ranking[0].total.toLocaleString("fr-FR")} conventions au total.`);
    }

    return list;
  }, [cur, prev, delta, role, filterAgencyId, ranking, rows.length]);

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

  const defaultPrefs = {
    showStats: true,
    showCompletion: true,
    showTargets: true,
    showCharts: true,
    showTopAgencies: true,
    showCrossTable: true,
  };
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem("dashboard_prefs");
      return saved ? JSON.parse(saved) : defaultPrefs;
    } catch { return defaultPrefs; }
  });
  const [prefsDialogOpen, setPrefsDialogOpen] = useState(false);
  const savePrefs = (newPrefs: typeof defaultPrefs) => {
    localStorage.setItem("dashboard_prefs", JSON.stringify(newPrefs));
    setPrefs(newPrefs);
  };

  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceYear, setCopySourceYear] = useState(year - 1);
  const [copyTargetYear, setCopyTargetYear] = useState(year);
  const [copyAgencyId, setCopyAgencyId] = useState("");
  const [copyPending, setCopyPending] = useState(false);

  const copyYearData = async () => {
    setCopyPending(true);
    try {
      let q = supabase.from("conventions").select("agency_id, month, cc, ce, pm").eq("year", copySourceYear);
      if (copyAgencyId) q = q.eq("agency_id", copyAgencyId);
      const { data: src } = await q;
      if (!src?.length) { toast.error(`Aucune donnée en ${copySourceYear}`); return; }
      const payload = src.map((r) => ({ agency_id: r.agency_id, year: copyTargetYear, month: r.month, cc: r.cc, ce: r.ce, pm: r.pm }));
      const { error } = await supabase.from("conventions").upsert(payload, { onConflict: "agency_id,year,month" });
      if (error) throw error;
      toast.success(`${payload.length} ligne${payload.length > 1 ? "s" : ""} copiée${payload.length > 1 ? "s" : ""} de ${copySourceYear} vers ${copyTargetYear}`);
      // qc.invalidateQueries();
      setCopyDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setCopyPending(false);
    }
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
    { label: "Total conventions", value: cur.total, delta, prevValue: prev.total, icon: FileText, tone: "bg-primary/10 text-primary" },
    { label: "Comptes Courants (CC)", value: cur.cc, delta: deltaCC, prevValue: prev.cc, icon: Wallet, tone: "bg-chart-2/10 text-chart-2" },
    { label: "Comptes Épargne (CE)", value: cur.ce, delta: deltaCE, prevValue: prev.ce, icon: PiggyBank, tone: "bg-chart-3/10 text-chart-3" },
    { label: "Personnes Morales (PM)", value: cur.pm, delta: deltaPM, prevValue: prev.pm, icon: Briefcase, tone: "bg-chart-4/10 text-chart-4" },
    { label: "Agences", value: filterAgencyId ? 1 : uniqueAgenciesInYear.size, icon: Building2, tone: "bg-chart-5/10 text-chart-5" },
    { label: "Mois renseignés", value: filledMonths.size, icon: CalendarCheck, tone: "bg-primary/10 text-primary" },
  ];

  const getBilanPayload = () => {
    if (!rows.length) return null;
    const agencyIds = role === "agent" && profile?.agency_id
      ? [profile.agency_id]
      : Array.from(new Set(rows.map((r) => r.agency_id)));
    return agencyIds.map((id) => {
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
  };

  const generateBilanExcel = () => {
    const payload = getBilanPayload();
    if (!payload) return toast.error(`Aucune donnée pour ${year}`);
    exportAnnualReport({ year, agencies: payload });
    toast.success(`Bilan Excel ${year} généré`);
  };

  const generateBilanPdf = async () => {
    const payload = getBilanPayload();
    if (!payload) return toast.error(`Aucune donnée pour ${year}`);
    await exportAnnualReportPdf({ year, agencies: payload });
    toast.success(`Bilan PDF ${year} généré`);
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
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Période" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Année complète</SelectItem>
              <SelectItem value="Q1">T1 (Jan-Mar)</SelectItem>
              <SelectItem value="Q2">T2 (Avr-Juin)</SelectItem>
              <SelectItem value="Q3">T3 (Juil-Sep)</SelectItem>
              <SelectItem value="Q4">T4 (Oct-Déc)</SelectItem>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary">
                <FileBarChart className="mr-1 h-4 w-4" />Bilan annuel
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={generateBilanExcel} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-500" /> Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={generateBilanPdf} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4 text-primary" /> Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={exportPdf}>
            <Image className="mr-1 h-4 w-4" />Capture PDF
          </Button>
          {role === "admin" && !filterAgencyId && (
            <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost"><Settings2 className="mr-1 h-4 w-4" />Copier</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Copier les données d'une année</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div>
                    <Label>Année source</Label>
                    <Select value={String(copySourceYear)} onValueChange={(v) => setCopySourceYear(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Array.from({ length: 2037 - 2015 + 1 }, (_, i) => 2015 + i).map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Année cible</Label>
                    <Select value={String(copyTargetYear)} onValueChange={(v) => setCopyTargetYear(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Array.from({ length: 2037 - 2015 + 1 }, (_, i) => 2015 + i).map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Agence (optionnel)</Label>
                    <Select value={copyAgencyId} onValueChange={setCopyAgencyId}>
                      <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Toutes les agences</SelectItem>
                        {agencies.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <DialogClose asChild><Button variant="outline" disabled={copyPending}>Annuler</Button></DialogClose>
                    <Button onClick={copyYearData} disabled={copyPending || copySourceYear === copyTargetYear}>
                      {copyPending ? "Copie…" : "Copier"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
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
          <Dialog open={prefsDialogOpen} onOpenChange={setPrefsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost"><Settings2 className="mr-1 h-4 w-4" />Affichage</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Personnaliser l'affichage</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <Label>Cartes statistiques</Label>
                  <Switch checked={prefs.showStats} onCheckedChange={(v) => savePrefs({ ...prefs, showStats: v })} />
                </div>
                {role === "admin" && (
                  <div className="flex items-center justify-between">
                    <Label>Taux de complétion</Label>
                    <Switch checked={prefs.showCompletion} onCheckedChange={(v) => savePrefs({ ...prefs, showCompletion: v })} />
                  </div>
                )}
                {role === "admin" && (
                  <div className="flex items-center justify-between">
                    <Label>Objectifs vs réalisé</Label>
                    <Switch checked={prefs.showTargets} onCheckedChange={(v) => savePrefs({ ...prefs, showTargets: v })} />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label>Graphiques (Évolution & Répartition)</Label>
                  <Switch checked={prefs.showCharts} onCheckedChange={(v) => savePrefs({ ...prefs, showCharts: v })} />
                </div>
                {role === "admin" && (
                  <div className="flex items-center justify-between">
                    <Label>Top agences</Label>
                    <Switch checked={prefs.showTopAgencies} onCheckedChange={(v) => savePrefs({ ...prefs, showTopAgencies: v })} />
                  </div>
                )}
                {role === "admin" && (
                  <div className="flex items-center justify-between">
                    <Label>Tableau croisé</Label>
                    <Switch checked={prefs.showCrossTable} onCheckedChange={(v) => savePrefs({ ...prefs, showCrossTable: v })} />
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      {/* Insights */}
      {insights.length > 0 && (
        <Card className="p-4 shadow-card bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 font-semibold text-primary mb-2">
            <Lightbulb className="h-4 w-4" /> À retenir
          </div>
          <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
            {insights.map((ins, i) => <li key={i}>{ins}</li>)}
          </ul>
        </Card>
      )}

      {/* Comparaison N vs N-1 */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4 shadow-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
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
      {prefs.showStats && (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((s, idx) => (
          <Card key={s.label} className={`p-4 shadow-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-${100 + idx * 75}`}>
            <div className={`inline-grid h-9 w-9 place-items-center rounded-lg ${s.tone}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-2xl font-black tabular-nums">{s.value.toLocaleString("fr-FR")}</span>
              {s.delta !== undefined && s.prevValue !== undefined && s.prevValue > 0 && (
                <span className={`text-[10px] font-semibold flex items-center ${s.delta >= 0 ? "text-success" : "text-destructive"}`}>
                  {s.delta >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {s.delta > 0 ? "+" : ""}{s.delta.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>
      )}

      {/* Taux de complétion */}
      {prefs.showCompletion && role === "admin" && !filterAgencyId && (
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
      {prefs.showTargets && role === "admin" && !filterAgencyId && targets.some((t) => t.cc || t.ce || t.pm) && (
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
      {prefs.showCharts && (
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 shadow-card lg:col-span-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <div className="mb-3 font-semibold">Comparaison {quarter !== "all" ? quarter : "mensuelle"} — {year} vs {year - 1}</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCompare}>
                <defs>
                  <linearGradient id="colorCur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={1}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--muted-foreground)" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mois" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey={year} fill="url(#colorCur)" radius={[4, 4, 0, 0]} />
                <Bar dataKey={`${year - 1}`} fill="url(#colorPrev)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 shadow-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
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
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {prefs.showCharts && (
        <Card className={cn("p-4 shadow-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300", prefs.showTopAgencies && role === "admin" ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="mb-3 font-semibold">Évolution {quarter !== "all" ? quarter : "mensuelle"} — {year}</div>
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
        )}

        {prefs.showTopAgencies && role === "admin" && (
          <Card className={cn("p-4 shadow-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500", prefs.showCharts ? "col-span-1" : "lg:col-span-3")}>
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
      {prefs.showCrossTable && role === "admin" && !filterAgencyId && (
        <Card className="p-4 shadow-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700">
          <div className="mb-3">
            <div className="font-semibold">Tableau croisé — {year} {quarter !== "all" ? `(${quarter})` : ""}</div>
            <div className="text-xs text-muted-foreground">Vue d'ensemble agence × mois</div>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
            <table className="w-full min-w-[500px] text-xs relative">
              <thead className="sticky top-0 bg-card z-10 shadow-sm">
                <tr className="border-b text-muted-foreground">
                  <th className="whitespace-nowrap px-2 py-2 text-left font-medium">Agence</th>
                  {displayMonths.map((x) => (
                    <th key={x.i} className="w-8 px-1 py-2 text-center font-medium">{x.m.slice(0, 3)}</th>
                  ))}
                  <th className="w-10 px-2 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((a) => {
                  const agencyRows = allYearRows.filter((r) => r.agency_id === a.id && activeMonths.includes(r.month));
                  const totals = sum(agencyRows);
                  return (
                    <tr key={a.id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                      <td className="whitespace-nowrap px-2 py-2 font-medium">{a.name}</td>
                      {displayMonths.map(({ i }) => {
                        const ok = filledCells.has(`${a.id}:${i}`);
                        return (
                          <td key={i} className="px-1 py-2">
                            <div className={`mx-auto h-5 w-5 rounded-sm ${ok ? "bg-success/30 ring-1 ring-success/40" : "bg-destructive/15 ring-1 ring-destructive/30"}`} title={ok ? `Mois ${i} renseigné` : `Mois ${i} manquant`} />
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums font-semibold">{totals.total.toLocaleString("fr-FR")}</td>
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
