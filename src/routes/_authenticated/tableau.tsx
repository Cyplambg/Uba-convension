import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MONTHS_FR, YEARS } from "@/lib/months";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, FileDown } from "lucide-react";
import { exportAgencyYear } from "@/lib/excel-export";
import { exportAgencyYearPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/_authenticated/tableau")({
  component: TableauAnnuel,
});

function TableauAnnuel() {
  const { role, profile } = useAuth();
  const [agencyId, setAgencyId] = useState<string>("");
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const { data: agencies } = useQuery({
    queryKey: ["agencies"],
    queryFn: async () => (await supabase.from("agencies").select("id, name, code").order("name")).data ?? [],
  });

  useEffect(() => {
    if (role === "agent" && profile?.agency_id) setAgencyId(profile.agency_id);
    else if (agencies?.length && !agencyId) setAgencyId(agencies[0].id);
  }, [role, profile, agencies, agencyId]);

  const { data: rows } = useQuery({
    queryKey: ["conv-year", agencyId, year],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("conventions")
        .select("month, cc, ce, pm")
        .eq("agency_id", agencyId)
        .eq("year", year);
      return data ?? [];
    },
  });

  const byMonth = useMemo(() => {
    const m = new Map<number, { cc: number; ce: number; pm: number }>();
    (rows ?? []).forEach((r) => m.set(r.month, { cc: r.cc, ce: r.ce, pm: r.pm }));
    return m;
  }, [rows]);

  const totals = useMemo(() => {
    let cc = 0, ce = 0, pm = 0;
    (rows ?? []).forEach((r) => { cc += r.cc; ce += r.ce; pm += r.pm; });
    return { cc, ce, pm, total: cc + ce + pm };
  }, [rows]);

  const agency = agencies?.find((a) => a.id === agencyId);

  const doExportExcel = () => {
    if (!agency) return;
    exportAgencyYear({
      agencyName: agency.name,
      agencyCode: agency.code,
      year,
      rows: (rows ?? []).map((r) => ({ month: r.month, cc: r.cc, ce: r.ce, pm: r.pm })),
    });
  };

  const doExportPdf = async () => {
    if (!agency) return;
    await exportAgencyYearPdf({
      agencyName: agency.name,
      agencyCode: agency.code,
      year,
      rows: (rows ?? []).map((r) => ({ month: r.month, cc: r.cc, ce: r.ce, pm: r.pm })),
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">Tableau annuel</h1>
          <p className="text-sm text-muted-foreground">Reproduction fidèle de la fiche papier</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Agence</Label>
            <Select value={agencyId} onValueChange={setAgencyId} disabled={role === "agent"}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{(agencies ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Année</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={doExportPdf} disabled={!agency}><FileDown className="mr-1 h-4 w-4" /> PDF</Button>
          <Button onClick={doExportExcel} disabled={!agency}><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button>
        </div>
      </div>

      <Card className="p-4 shadow-card">
        <div className="mb-3 text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">UBA Archives</div>
          <div className="text-lg font-bold">{agency?.name ?? "—"} — {year}</div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Mois</TableHead>
                <TableHead className="text-right">CC</TableHead>
                <TableHead className="text-right">CE</TableHead>
                <TableHead className="text-right">PM</TableHead>
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MONTHS_FR.map((m, i) => {
                const r = byMonth.get(i + 1);
                const cc = r?.cc ?? 0, ce = r?.ce ?? 0, pm = r?.pm ?? 0;
                const t = cc + ce + pm;
                return (
                  <TableRow key={m}>
                    <TableCell className="font-medium">{m}</TableCell>
                    <TableCell className="text-right tabular-nums">{cc || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{ce || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{pm || "—"}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{t || "—"}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="border-t-2 border-primary bg-primary/5 font-black">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right tabular-nums">{totals.cc.toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.ce.toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.pm.toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-right text-primary tabular-nums">{totals.total.toLocaleString("fr-FR")}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
