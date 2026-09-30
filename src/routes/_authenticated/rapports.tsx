import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, FileText, Wallet, PiggyBank, Briefcase, Building2,
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Download,
  ClipboardList, Clock, AlertTriangle, CheckCircle2, Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { downloadFile } from "@/lib/download";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rapports")({
  component: RapportsPage,
});

/* ─── helpers ─── */

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

/** Return Thursday 00:00 of the business week (Thu–Wed) containing `d`. */
function startOfWeek(d: Date): Date {
  const dt = new Date(d);
  const day = dt.getDay(); // 0=Sun … 4=Thu … 6=Sat
  // Distance back to the most recent Thursday
  const diff = (day - 4 + 7) % 7; // 0 when day=Thu, 1 when Fri, …, 6 when Wed
  dt.setDate(dt.getDate() - diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/** Return Wednesday 23:59:59 of the business week (Thu–Wed) containing `d`. */
function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** ISO week number */
function getISOWeek(d: Date): number {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateISO(d: Date): string {
  return d.toISOString();
}

/* ─── component ─── */

function RapportsPage() {
  const { role, profile } = useAuth();

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const selectedDate = new Date(today);
  selectedDate.setDate(selectedDate.getDate() + weekOffset * 7);

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekEnd);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

  const weekNumber = getISOWeek(weekStart);
  const isCurrentWeek = weekOffset === 0;

  // Filter by agency for admins
  const [filterAgencyId, setFilterAgencyId] = useState<string>("");

  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch conventions created/updated during selected week and previous week
  const { data, isLoading } = useQuery({
    queryKey: ["weekly-report", weekStart.toISOString(), role, profile?.agency_id, filterAgencyId],
    queryFn: async () => {
      // Fetch conventions where created_at or updated_at is within the week range
      let qThisWeek = supabase
        .from("conventions")
        .select("id, agency_id, month, year, cc, ce, pm, created_at, updated_at")
        .or(`created_at.gte.${formatDateISO(weekStart)},updated_at.gte.${formatDateISO(weekStart)}`)
        .or(`created_at.lte.${formatDateISO(weekEnd)},updated_at.lte.${formatDateISO(weekEnd)}`);

      if (role === "agent" && profile?.agency_id) {
        qThisWeek = qThisWeek.eq("agency_id", profile.agency_id);
      }
      if (filterAgencyId) {
        qThisWeek = qThisWeek.eq("agency_id", filterAgencyId);
      }

      let qPrevWeek = supabase
        .from("conventions")
        .select("id, agency_id, month, year, cc, ce, pm, created_at, updated_at")
        .or(`created_at.gte.${formatDateISO(prevWeekStart)},updated_at.gte.${formatDateISO(prevWeekStart)}`)
        .or(`created_at.lte.${formatDateISO(prevWeekEnd)},updated_at.lte.${formatDateISO(prevWeekEnd)}`);

      if (role === "agent" && profile?.agency_id) {
        qPrevWeek = qPrevWeek.eq("agency_id", profile.agency_id);
      }
      if (filterAgencyId) {
        qPrevWeek = qPrevWeek.eq("agency_id", filterAgencyId);
      }

      const [thisWeekRes, prevWeekRes, agenciesRes] = await Promise.all([
        qThisWeek,
        qPrevWeek,
        supabase.from("agencies").select("id, name, code"),
      ]);

      return {
        thisWeek: thisWeekRes.data ?? [],
        prevWeek: prevWeekRes.data ?? [],
        agencies: agenciesRes.data ?? [],
      };
    },
  });

  const thisWeekRows = data?.thisWeek ?? [];
  const prevWeekRows = data?.prevWeek ?? [];
  const agencies = data?.agencies ?? [];
  const agencyName = (id: string) => agencies.find((a) => a.id === id)?.name ?? "—";
  const agencyCode = (id: string) => agencies.find((a) => a.id === id)?.code ?? "";

  // Filter rows to only those truly within the week windows
  const filterInRange = (rows: typeof thisWeekRows, start: Date, end: Date) =>
    rows.filter((r) => {
      const created = new Date(r.created_at);
      const updated = new Date(r.updated_at);
      return (created >= start && created <= end) || (updated >= start && updated <= end);
    });

  const weekRows = filterInRange(thisWeekRows, weekStart, weekEnd);
  const prevRows = filterInRange(prevWeekRows, prevWeekStart, prevWeekEnd);

  // Summaries
  const sum = (rs: typeof weekRows) => {
    const cc = rs.reduce((s, r) => s + (r.cc ?? 0), 0);
    const ce = rs.reduce((s, r) => s + (r.ce ?? 0), 0);
    const pm = rs.reduce((s, r) => s + (r.pm ?? 0), 0);
    return { cc, ce, pm, total: cc + ce + pm, count: rs.length };
  };

  const cur = sum(weekRows);
  const prev = sum(prevRows);
  const delta = prev.total ? ((cur.total - prev.total) / prev.total) * 100 : 0;
  const deltaCount = prev.count ? ((cur.count - prev.count) / prev.count) * 100 : 0;

  // Separate new vs updated
  const newConventions = weekRows.filter((r) => {
    const created = new Date(r.created_at);
    return created >= weekStart && created <= weekEnd;
  });
  const updatedConventions = weekRows.filter((r) => {
    const created = new Date(r.created_at);
    const updated = new Date(r.updated_at);
    return !(created >= weekStart && created <= weekEnd) && updated >= weekStart && updated <= weekEnd;
  });

  // By agency breakdown
  const agencyBreakdown = useMemo(() => {
    const map = new Map<string, { cc: number; ce: number; pm: number; count: number; prevTotal: number }>();
    weekRows.forEach((r) => {
      const existing = map.get(r.agency_id) ?? { cc: 0, ce: 0, pm: 0, count: 0, prevTotal: 0 };
      existing.cc += r.cc ?? 0;
      existing.ce += r.ce ?? 0;
      existing.pm += r.pm ?? 0;
      existing.count += 1;
      map.set(r.agency_id, existing);
    });
    // Add previous week totals
    prevRows.forEach((r) => {
      const existing = map.get(r.agency_id);
      if (existing) {
        existing.prevTotal += (r.cc ?? 0) + (r.ce ?? 0) + (r.pm ?? 0);
      }
    });
    return Array.from(map.entries())
      .map(([id, data]) => ({
        id,
        name: agencyName(id),
        code: agencyCode(id),
        ...data,
        total: data.cc + data.ce + data.pm,
      }))
      .sort((a, b) => b.total - a.total);
  }, [weekRows, prevRows, agencies]);

  // By day breakdown (Mon–Sun)
  const dailyBreakdown = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return {
        label: DAYS_FR[d.getDay()].slice(0, 3),
        fullLabel: DAYS_FR[d.getDay()],
        date: formatDate(d),
        cc: 0,
        ce: 0,
        pm: 0,
        count: 0,
      };
    });
    weekRows.forEach((r) => {
      const created = new Date(r.created_at);
      const updated = new Date(r.updated_at);
      const relevantDate = (created >= weekStart && created <= weekEnd) ? created : updated;
      const dayIdx = Math.floor((relevantDate.getTime() - weekStart.getTime()) / 86400000);
      if (dayIdx >= 0 && dayIdx < 7) {
        days[dayIdx].cc += r.cc ?? 0;
        days[dayIdx].ce += r.ce ?? 0;
        days[dayIdx].pm += r.pm ?? 0;
        days[dayIdx].count += 1;
      }
    });
    return days;
  }, [weekRows, weekStart]);

  // Pie chart data
  const pie = [
    { name: "CC", value: cur.cc, color: "var(--chart-2)" },
    { name: "CE", value: cur.ce, color: "var(--chart-3)" },
    { name: "PM", value: cur.pm, color: "var(--chart-4)" },
  ];

  // Détails par convention
  const detailRows = useMemo(() => {
    return weekRows
      .map((r) => {
        const created = new Date(r.created_at);
        const updated = new Date(r.updated_at);
        const isNew = created >= weekStart && created <= weekEnd;
        return {
          ...r,
          agencyName: agencyName(r.agency_id),
          agencyCode: agencyCode(r.agency_id),
          type: isNew ? ("Nouveau" as const) : ("Modifié" as const),
          actionDate: isNew ? created : updated,
          total: (r.cc ?? 0) + (r.ce ?? 0) + (r.pm ?? 0),
        };
      })
      .sort((a, b) => b.actionDate.getTime() - a.actionDate.getTime());
  }, [weekRows, weekStart, weekEnd, agencies]);

  // Export PDF
  const exportPdf = async () => {
    const el = reportRef.current;
    if (!el) return;
    toast.info("Génération du rapport PDF…");
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
      downloadFile(
        new Uint8Array(buffer),
        `Rapport_hebdomadaire_S${weekNumber}_${weekStart.getFullYear()}.pdf`,
        "application/pdf",
      );
      toast.success("Rapport PDF généré !");
    } finally {
      document.body.style.overflow = origOverflow;
    }
  };

  // Stats cards
  const stats = [
    {
      label: "Conventions traitées",
      value: cur.count,
      delta: deltaCount,
      prevValue: prev.count,
      icon: ClipboardList,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Total conventions (CC+CE+PM)",
      value: cur.total,
      delta,
      prevValue: prev.total,
      icon: FileText,
      tone: "bg-chart-2/10 text-chart-2",
    },
    {
      label: "Comptes Courants (CC)",
      value: cur.cc,
      icon: Wallet,
      tone: "bg-chart-2/10 text-chart-2",
    },
    {
      label: "Comptes Épargne (CE)",
      value: cur.ce,
      icon: PiggyBank,
      tone: "bg-chart-3/10 text-chart-3",
    },
    {
      label: "Personnes Morales (PM)",
      value: cur.pm,
      icon: Briefcase,
      tone: "bg-chart-4/10 text-chart-4",
    },
    {
      label: "Agences actives",
      value: new Set(weekRows.map((r) => r.agency_id)).size,
      icon: Building2,
      tone: "bg-chart-5/10 text-chart-5",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">Rapport hebdomadaire</h1>
          <p className="text-sm text-muted-foreground">
            Conventions enregistrées & modifiées — Semaine {weekNumber}, {weekStart.getFullYear()}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {/* Week navigation */}
          <div className="flex items-center gap-1 rounded-lg border bg-card px-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset((o) => o - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-2 text-center">
              <div className="text-xs font-semibold">S{weekNumber}</div>
              <div className="text-[10px] text-muted-foreground">
                {formatDate(weekStart)} — {formatDate(weekEnd)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset((o) => o + 1)}
              disabled={isCurrentWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isCurrentWeek && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Semaine en cours
            </Badge>
          )}

          {role === "admin" && (
            <Select value={filterAgencyId} onValueChange={setFilterAgencyId}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les agences</SelectItem>
                {agencies.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Button size="sm" variant="outline" onClick={exportPdf}>
            <Printer className="mr-1 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* Status banner */}
        {isLoading ? (
          <Card className="p-6 text-center text-muted-foreground animate-pulse">
            Chargement du rapport…
          </Card>
        ) : weekRows.length === 0 ? (
          <Card className="border-warning/40 bg-warning/5 p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-warning/15 text-warning">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Aucune activité cette semaine</div>
                <div className="text-sm text-muted-foreground">
                  Aucune convention n'a été créée ou modifiée du {formatDate(weekStart)} au {formatDate(weekEnd)}.
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Summary banner */}
            <Card className="flex flex-wrap items-center justify-between gap-4 p-4 shadow-card bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Bilan Semaine {weekNumber}
                  </div>
                  <div className="text-2xl font-black tabular-nums">
                    {cur.count} convention{cur.count > 1 ? "s" : ""} traitée{cur.count > 1 ? "s" : ""}
                    <span className="ml-2 text-sm font-medium text-muted-foreground">
                      ({newConventions.length} nouvelle{newConventions.length > 1 ? "s" : ""}, {updatedConventions.length} modifiée{updatedConventions.length > 1 ? "s" : ""})
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {prev.count > 0 && (
                  <div className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ${delta >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {delta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {delta > 0 ? "+" : ""}{delta.toFixed(1)}% vs S{weekNumber - 1}
                  </div>
                )}
              </div>
            </Card>

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {stats.map((s, idx) => (
                <Card key={s.label} className={`p-4 shadow-card animate-in fade-in slide-in-from-bottom-4 duration-500`} style={{ animationDelay: `${100 + idx * 75}ms` }}>
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

            {/* Charts row */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Daily activity */}
              <Card className="p-4 shadow-card lg:col-span-2 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "200ms" }}>
                <div className="mb-3 font-semibold">Activité journalière</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyBreakdown}>
                      <defs>
                        <linearGradient id="gradCC" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                        </linearGradient>
                        <linearGradient id="gradCE" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.4} />
                        </linearGradient>
                        <linearGradient id="gradPM" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-4)" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="var(--chart-4)" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                        formatter={(value: number, name: string) => [value.toLocaleString("fr-FR"), name]}
                      />
                      <Legend />
                      <Bar dataKey="cc" name="CC" fill="url(#gradCC)" radius={[4, 4, 0, 0]} stackId="stack" />
                      <Bar dataKey="ce" name="CE" fill="url(#gradCE)" radius={[0, 0, 0, 0]} stackId="stack" />
                      <Bar dataKey="pm" name="PM" fill="url(#gradPM)" radius={[4, 4, 0, 0]} stackId="stack" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Pie */}
              <Card className="p-4 shadow-card animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "300ms" }}>
                <div className="mb-3 font-semibold">Répartition CC/CE/PM</div>
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

            {/* Agency breakdown */}
            {role === "admin" && !filterAgencyId && agencyBreakdown.length > 0 && (
              <Card className="p-4 shadow-card animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "400ms" }}>
                <div className="mb-3 flex items-center gap-2 font-semibold">
                  <Building2 className="h-4 w-4 text-primary" />
                  Activité par agence
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="px-3 py-2.5 text-left font-medium">Agence</th>
                        <th className="px-3 py-2.5 text-center font-medium">Entrées</th>
                        <th className="px-3 py-2.5 text-center font-medium">CC</th>
                        <th className="px-3 py-2.5 text-center font-medium">CE</th>
                        <th className="px-3 py-2.5 text-center font-medium">PM</th>
                        <th className="px-3 py-2.5 text-right font-medium">Total</th>
                        <th className="px-3 py-2.5 text-right font-medium">Tendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agencyBreakdown.map((a, idx) => {
                        const agDelta = a.prevTotal ? ((a.total - a.prevTotal) / a.prevTotal) * 100 : null;
                        return (
                          <tr key={a.id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="font-medium">{a.name}</div>
                                  {a.code && <div className="text-[10px] text-muted-foreground">{a.code}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums">{a.count}</td>
                            <td className="px-3 py-2.5 text-center tabular-nums">{a.cc.toLocaleString("fr-FR")}</td>
                            <td className="px-3 py-2.5 text-center tabular-nums">{a.ce.toLocaleString("fr-FR")}</td>
                            <td className="px-3 py-2.5 text-center tabular-nums">{a.pm.toLocaleString("fr-FR")}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{a.total.toLocaleString("fr-FR")}</td>
                            <td className="px-3 py-2.5 text-right">
                              {agDelta !== null ? (
                                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${agDelta >= 0 ? "text-success" : "text-destructive"}`}>
                                  {agDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                  {agDelta > 0 ? "+" : ""}{agDelta.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="px-3 py-2.5">Total</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{cur.count}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{cur.cc.toLocaleString("fr-FR")}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{cur.ce.toLocaleString("fr-FR")}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{cur.pm.toLocaleString("fr-FR")}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{cur.total.toLocaleString("fr-FR")}</td>
                        <td className="px-3 py-2.5 text-right">
                          {prev.total > 0 && (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${delta >= 0 ? "text-success" : "text-destructive"}`}>
                              {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}

            {/* Detailed conventions table */}
            <Card className="p-4 shadow-card animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "500ms" }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4 text-primary" />
                  Détail des conventions
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Nouveau
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-chart-3" />
                    Modifié
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-10 shadow-sm">
                    <tr className="border-b text-muted-foreground">
                      <th className="px-3 py-2.5 text-left font-medium">Statut</th>
                      <th className="px-3 py-2.5 text-left font-medium">Agence</th>
                      <th className="px-3 py-2.5 text-center font-medium">Mois</th>
                      <th className="px-3 py-2.5 text-center font-medium">Année</th>
                      <th className="px-3 py-2.5 text-center font-medium">CC</th>
                      <th className="px-3 py-2.5 text-center font-medium">CE</th>
                      <th className="px-3 py-2.5 text-center font-medium">PM</th>
                      <th className="px-3 py-2.5 text-right font-medium">Total</th>
                      <th className="px-3 py-2.5 text-right font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((r) => (
                      <tr key={r.id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5">
                          {r.type === "Nouveau" ? (
                            <Badge variant="default" className="bg-success/15 text-success hover:bg-success/20 text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Nouveau
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <Clock className="h-3 w-3" /> Modifié
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium">{r.agencyName}</div>
                          {r.agencyCode && <div className="text-[10px] text-muted-foreground">{r.agencyCode}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{MONTHS_SHORT[r.month - 1]}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{r.year}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{r.cc.toLocaleString("fr-FR")}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{r.ce.toLocaleString("fr-FR")}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{r.pm.toLocaleString("fr-FR")}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{r.total.toLocaleString("fr-FR")}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(r.actionDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
