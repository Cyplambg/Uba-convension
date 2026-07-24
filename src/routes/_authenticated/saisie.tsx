import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MONTHS_FR } from "@/lib/months";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/saisie")({
  component: Saisie,
});

function Saisie() {
  const { role, profile } = useAuth();

  const { data: agencies } = useQuery({
    queryKey: ["agencies"],
    queryFn: async () => (await supabase.from("agencies").select("id, name, code").order("name")).data ?? [],
  });

  const now = new Date();
  const [agencyId, setAgencyId] = useState<string>("");
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<string>("mensuelle");

  useEffect(() => {
    if (role === "agent" && profile?.agency_id) setAgencyId(profile.agency_id);
    else if (agencies && agencies.length && !agencyId) setAgencyId(agencies[0].id);
  }, [role, profile, agencies, agencyId]);

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Saisie des conventions</h1>
        <p className="text-sm text-muted-foreground">Enregistrez ou modifiez les données par mois ou pour toute l'année.</p>
      </div>

      <Card className="mb-6 p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div>
            <Label>Année</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {Array.from({ length: 2037 - 2015 + 1 }, (_, i) => 2015 + i).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 w-full grid grid-cols-2">
          <TabsTrigger value="mensuelle">Saisie Mensuelle</TabsTrigger>
          <TabsTrigger value="annuelle">Saisie Annuelle (12 mois)</TabsTrigger>
        </TabsList>
        <TabsContent value="mensuelle">
          <SaisieMensuelle agencyId={agencyId} year={year} month={month} setMonth={setMonth} setYear={setYear} />
        </TabsContent>
        <TabsContent value="annuelle">
          <Card className="p-4 shadow-card md:p-5">
            <SaisieAnnuelle agencyId={agencyId} year={year} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SaisieMensuelle({ agencyId, year, month, setMonth, setYear }: { agencyId: string, year: number, month: number, setMonth: any, setYear: any }) {
  const qc = useQueryClient();
  const [cc, setCc] = useState<string>("");
  const [ce, setCe] = useState<string>("");
  const [pm, setPm] = useState<string>("");
  const [originalRow, setOriginalRow] = useState<{ year: number; month: number } | null>(null);
  const loadedKeyRef = useRef("");

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

  const draftKey = `brouillon_${agencyId}_${year}_${month}`;
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const key = `${agencyId}_${year}_${month}`;
    const draftStr = localStorage.getItem(draftKey);
    let loadedDraft = false;
    
    if (draftStr) {
      try {
        const d = JSON.parse(draftStr);
        setCc(d.cc ?? "");
        setCe(d.ce ?? "");
        setPm(d.pm ?? "");
        loadedDraft = true;
        setHasDraft(true);
      } catch (e) {}
    }

    if (!loadedDraft) {
      setCc(existing?.cc?.toString() ?? "");
      setCe(existing?.ce?.toString() ?? "");
      setPm(existing?.pm?.toString() ?? "");
      setHasDraft(false);
    }

    if (existing) {
      if (loadedKeyRef.current !== key) {
        setOriginalRow({ year, month });
        loadedKeyRef.current = key;
      }
    } else {
      setOriginalRow(null);
      loadedKeyRef.current = "";
    }
  }, [existing, agencyId, year, month, draftKey]);

  useEffect(() => {
    if (!agencyId) return;
    const isDifferent = 
      cc !== (existing?.cc?.toString() ?? "") || 
      ce !== (existing?.ce?.toString() ?? "") || 
      pm !== (existing?.pm?.toString() ?? "");
      
    if (isDifferent && (cc || ce || pm)) {
      localStorage.setItem(draftKey, JSON.stringify({ cc, ce, pm }));
      setHasDraft(true);
    } else if (!isDifferent) {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
    }
  }, [cc, ce, pm, agencyId, year, month, existing, draftKey]);

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
      localStorage.removeItem(`brouillon_${agencyId}_${year}_${month}`);
      setHasDraft(false);
      toast.success(dateChanged ? "Date modifiée" : "Saisie enregistrée");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const monthName = (m: number) => MONTHS_FR[m - 1] ?? "";

  const goPrevMonth = useCallback(() => {
    if (month <= 1) { if (year > 2015) { setYear(year - 1); setMonth(12); } }
    else setMonth(month - 1);
  }, [month, year, setMonth, setYear]);

  const goNextMonth = useCallback(() => {
    if (month >= 12) { if (year < 2037) { setYear(year + 1); setMonth(1); } }
    else setMonth(month + 1);
  }, [month, year, setMonth, setYear]);

  const resetForm = useCallback(() => {
    setCc(""); setCe(""); setPm("");
    localStorage.removeItem(draftKey);
    setHasDraft(false);
  }, [draftKey]);

  const del = useMutation({
    mutationFn: async () => {
      if (!agencyId || !existing) throw new Error("Aucune donnée à supprimer");
      const { error } = await supabase
        .from("conventions")
        .delete()
        .eq("agency_id", agencyId)
        .eq("year", year)
        .eq("month", month);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Données supprimées");
      resetForm();
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-4 md:p-5 shadow-card">
      <div className="flex items-center justify-between gap-2 mb-4">
        <Button variant="outline" size="icon" onClick={goPrevMonth} title="Mois précédent">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex justify-center text-center">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-auto border-none shadow-none font-semibold text-base px-2 h-auto"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS_FR.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="icon" onClick={goNextMonth} title="Mois suivant">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {dateChanged && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            Changement de date : {monthName(originalRow!.month)} {originalRow!.year} → {monthName(month)} {year}
          </div>
        )}

        {!!originalRow && !dateChanged && !hasDraft && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
            Modification des valeurs pour {monthName(month)} {year}
          </div>
        )}

        {hasDraft && (
          <div className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200">
            Brouillon chargé. <button className="underline cursor-pointer" onClick={resetForm}>Annuler</button>
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

        <div className="flex gap-2">
          <Button className="flex-1" size="lg" onClick={() => save.mutate()} disabled={save.isPending || !agencyId}>
            {save.isPending ? "Enregistrement…" : dateChanged ? "Changer la date" : existing ? "Mettre à jour" : "Enregistrer"}
          </Button>
          {hasDraft && (
            <Button variant="outline" size="icon" onClick={resetForm} title="Réinitialiser" disabled={save.isPending}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {existing && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" size="sm" disabled={del.isPending}>
                <Trash2 className="mr-1 h-4 w-4" />{del.isPending ? "Suppression…" : "Supprimer ces données"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Voulez-vous vraiment supprimer les données de {monthName(month)} {year} pour cette agence ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => del.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </Card>
  );
}

function SaisieAnnuelle({ agencyId, year }: { agencyId: string, year: number }) {
  const qc = useQueryClient();
  const draftKey = `brouillon_annuel_${agencyId}_${year}`;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["conv_annual", agencyId, year],
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

  const [rows, setRows] = useState(() => Array(12).fill({ cc: "", ce: "", pm: "" }));
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    let loadedDraft = false;
    const draftStr = localStorage.getItem(draftKey);
    if (draftStr) {
      try {
        const d = JSON.parse(draftStr);
        setRows(d);
        loadedDraft = true;
        setHasDraft(true);
      } catch(e) {}
    }

    if (!loadedDraft) {
      if (existing) {
        const newRows = Array(12).fill({ cc: "", ce: "", pm: "" });
        existing.forEach(r => {
          newRows[r.month - 1] = { 
            cc: r.cc?.toString() || "", 
            ce: r.ce?.toString() || "", 
            pm: r.pm?.toString() || "" 
          };
        });
        setRows(newRows);
      } else {
        setRows(Array(12).fill({ cc: "", ce: "", pm: "" }));
      }
      setHasDraft(false);
    }
  }, [existing, agencyId, year, draftKey]);

  useEffect(() => {
    if (!existing) return;
    const isDifferent = rows.some((r, i) => {
      const ex = existing.find(x => x.month === i + 1);
      const exCc = ex?.cc?.toString() || "";
      const exCe = ex?.ce?.toString() || "";
      const exPm = ex?.pm?.toString() || "";
      return r.cc !== exCc || r.ce !== exCe || r.pm !== exPm;
    });
    
    if (isDifferent) {
      localStorage.setItem(draftKey, JSON.stringify(rows));
      setHasDraft(true);
    } else {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
    }
  }, [rows, existing, draftKey]);

  const updateRow = (idx: number, field: "cc" | "ce" | "pm", val: string) => {
    const copy = [...rows];
    copy[idx] = { ...copy[idx], [field]: val };
    setRows(copy);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!agencyId) throw new Error("Choisissez une agence");
      
      const payload = rows.map((r, i) => ({
        agency_id: agencyId,
        year,
        month: i + 1,
        cc: Number(r.cc) || 0,
        ce: Number(r.ce) || 0,
        pm: Number(r.pm) || 0,
      })).filter(r => r.cc > 0 || r.ce > 0 || r.pm > 0 || existing?.some(x => x.month === r.month)); 
      
      if (payload.length > 0) {
        const { error } = await supabase.from("conventions").upsert(payload, { onConflict: "agency_id,year,month" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      toast.success("Année complète enregistrée !");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    if (existing) {
      const newRows = Array(12).fill({ cc: "", ce: "", pm: "" });
      existing.forEach(r => {
        newRows[r.month - 1] = { 
          cc: r.cc?.toString() || "", 
          ce: r.ce?.toString() || "", 
          pm: r.pm?.toString() || "" 
        };
      });
      setRows(newRows);
    } else {
      setRows(Array(12).fill({ cc: "", ce: "", pm: "" }));
    }
  };

  if (isLoading) return <div className="py-10 text-center text-sm text-muted-foreground">Chargement...</div>;

  const totalGlobal = rows.reduce((acc, r) => acc + (Number(r.cc)||0) + (Number(r.ce)||0) + (Number(r.pm)||0), 0);

  return (
    <div className="space-y-4">
      {hasDraft && (
        <div className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200">
          Brouillon chargé. <button className="underline cursor-pointer" onClick={resetForm}>Annuler</button>
        </div>
      )}
      
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Mois</th>
              <th className="px-3 py-2 text-center font-medium min-w-[70px]">CC</th>
              <th className="px-3 py-2 text-center font-medium min-w-[70px]">CE</th>
              <th className="px-3 py-2 text-center font-medium min-w-[70px]">PM</th>
              <th className="px-3 py-2 text-right font-medium min-w-[70px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS_FR.map((m, i) => {
              const r = rows[i];
              const rowTotal = (Number(r.cc)||0) + (Number(r.ce)||0) + (Number(r.pm)||0);
              return (
                <tr key={m} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium text-xs sm:text-sm">{m.slice(0, 3)}</td>
                  <td className="px-1 py-1.5">
                    <Input className="h-8 text-center px-1 text-xs" inputMode="numeric" pattern="[0-9]*" value={r.cc} onChange={e => updateRow(i, "cc", e.target.value.replace(/\D/g, ""))} />
                  </td>
                  <td className="px-1 py-1.5">
                    <Input className="h-8 text-center px-1 text-xs" inputMode="numeric" pattern="[0-9]*" value={r.ce} onChange={e => updateRow(i, "ce", e.target.value.replace(/\D/g, ""))} />
                  </td>
                  <td className="px-1 py-1.5">
                    <Input className="h-8 text-center px-1 text-xs" inputMode="numeric" pattern="[0-9]*" value={r.pm} onChange={e => updateRow(i, "pm", e.target.value.replace(/\D/g, ""))} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-muted-foreground text-xs">{rowTotal.toLocaleString("fr-FR")}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-primary/5 font-semibold">
            <tr>
              <td colSpan={4} className="px-3 py-3 text-right">TOTAL ANNÉE</td>
              <td className="px-3 py-3 text-right text-lg text-primary tabular-nums">{totalGlobal.toLocaleString("fr-FR")}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {hasDraft && <Button variant="outline" onClick={resetForm} disabled={save.isPending}>Réinitialiser</Button>}
        <Button onClick={() => save.mutate()} disabled={save.isPending || !agencyId}>
          {save.isPending ? "Enregistrement en cours..." : "Enregistrer l'année"}
        </Button>
      </div>
    </div>
  );
}
