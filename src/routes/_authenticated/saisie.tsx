import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MONTHS_FR, YEARS } from "@/lib/months";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/saisie")({
  component: Saisie,
});

function Saisie() {
  const { role, profile } = useAuth();
  const qc = useQueryClient();

  const { data: agencies } = useQuery({
    queryKey: ["agencies"],
    queryFn: async () => (await supabase.from("agencies").select("id, name, code").order("name")).data ?? [],
  });

  const now = new Date();
  const [agencyId, setAgencyId] = useState<string>("");
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [cc, setCc] = useState<string>("");
  const [ce, setCe] = useState<string>("");
  const [pm, setPm] = useState<string>("");

  const [originalRow, setOriginalRow] = useState<{ year: number; month: number } | null>(null);

  useEffect(() => {
    if (role === "agent" && profile?.agency_id) setAgencyId(profile.agency_id);
    else if (agencies && agencies.length && !agencyId) setAgencyId(agencies[0].id);
  }, [role, profile, agencies, agencyId]);

  const { data: existing } = useQuery({
    queryKey: ["conv", agencyId, year, month],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("conventions")
        .select("cc, ce, pm")
        .eq("agency_id", agencyId)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    setCc(existing?.cc?.toString() ?? "");
    setCe(existing?.ce?.toString() ?? "");
    setPm(existing?.pm?.toString() ?? "");
    if (existing) {
      setOriginalRow({ year, month });
    } else {
      setOriginalRow(null);
    }
  }, [existing]);

  const dateChanged = !!originalRow && (originalRow.year !== year || originalRow.month !== month);

  const total = useMemo(() => (Number(cc) || 0) + (Number(ce) || 0) + (Number(pm) || 0), [cc, ce, pm]);

  const save = useMutation({
    mutationFn: async () => {
      if (!agencyId) throw new Error("Choisissez une agence");

      if (dateChanged && originalRow) {
        const { error: delErr } = await supabase
          .from("conventions")
          .delete()
          .eq("agency_id", agencyId)
          .eq("year", originalRow.year)
          .eq("month", originalRow.month);
        if (delErr) throw delErr;
      }

      const payload = {
        agency_id: agencyId,
        year,
        month,
        cc: Number(cc) || 0,
        ce: Number(ce) || 0,
        pm: Number(pm) || 0,
      };
      const { error } = await supabase
        .from("conventions")
        .upsert(payload, { onConflict: "agency_id,year,month" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(dateChanged ? "Date modifiée" : "Saisie enregistrée");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const monthName = (m: number) => MONTHS_FR[m - 1] ?? "";

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Saisie mensuelle</h1>
        <p className="text-sm text-muted-foreground">Enregistrez ou modifiez les conventions du mois.</p>
      </div>

      <Card className="p-5 shadow-card">
        <div className="space-y-4">
          <div>
            <Label>Agence</Label>
            <Select value={agencyId} onValueChange={setAgencyId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {(agencies ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} ({a.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Année</Label>
              {role === "admin" ? (
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={year}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/\D/g, ""));
                    if (v) setYear(v);
                  }}
                />
              ) : (
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Mois</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS_FR.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {dateChanged && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              Changement de date : {monthName(originalRow!.month)} {originalRow!.year} → {monthName(month)} {year}
            </div>
          )}

          {!!originalRow && !dateChanged && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
              Modification des valeurs pour {monthName(month)} {year}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>CC</Label>
              <Input inputMode="numeric" pattern="[0-9]*" value={cc} onChange={(e) => setCc(e.target.value.replace(/\D/g, ""))} placeholder="0" />
              <p className="mt-1 text-[10px] text-muted-foreground">Comptes Courants</p>
            </div>
            <div>
              <Label>CE</Label>
              <Input inputMode="numeric" pattern="[0-9]*" value={ce} onChange={(e) => setCe(e.target.value.replace(/\D/g, ""))} placeholder="0" />
              <p className="mt-1 text-[10px] text-muted-foreground">Comptes Épargne</p>
            </div>
            <div>
              <Label>PM</Label>
              <Input inputMode="numeric" pattern="[0-9]*" value={pm} onChange={(e) => setPm(e.target.value.replace(/\D/g, ""))} placeholder="0" />
              <p className="mt-1 text-[10px] text-muted-foreground">Personnes Morales</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gradient-primary p-4 text-primary-foreground shadow-elegant">
            <span className="text-sm font-semibold uppercase tracking-wide opacity-90">Total</span>
            <span className="text-3xl font-black tabular-nums">{total.toLocaleString("fr-FR")}</span>
          </div>

          <Button className="w-full" size="lg" onClick={() => save.mutate()} disabled={save.isPending || !agencyId}>
            {save.isPending ? "Enregistrement…" : dateChanged ? "Changer la date" : existing ? "Mettre à jour" : "Enregistrer"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
