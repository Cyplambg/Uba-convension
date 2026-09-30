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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { addToSyncQueue } from "@/lib/sync";

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

      if (!navigator.onLine) {
        addToSyncQueue(payload);
        return { offline: true };
      }

      const { error } = await supabase
        .from("conventions")
        .upsert(payload, { onConflict: "agency_id,year,month" });
      if (error) throw error;
      return { offline: false };
    },
    onSuccess: (data) => {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      if (data?.offline) {
        toast.success("Hors ligne : Enregistré localement");
      } else {
        toast.success(dateChanged ? "Date modifiée" : "Saisie enregistrée");
      }
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

function SaisieAnnuelle({ agencyId, year }: { agencyId: string; year: number }) {
  const qc = useQueryClient();
  const draftKey = `brouillon_annuel_${agencyId}_${year}`;
  const [mode, setMode] = useState<"replace" | "add">("replace");
  const [quickFillOpen, setQuickFillOpen] = useState(false);
  const [quickCc, setQuickCc] = useState("");
  const [quickCe, setQuickCe] = useState("");
  const [quickPm, setQuickPm] = useState("");

  // Effect pour vider les champs quand on passe en mode "add"
  // et recharger les données quand on revient en mode "replace"
  useEffect(() => {
    if (mode === "add") {
      setRows(emptyRows());
      localStorage.removeItem(draftKey);
      setHasDraft(false);
    } else if (mode === "replace") {
      // Recharger les données existantes en mode replace
      if (existing && existing.length > 0) {
        const newRows = emptyRows();
        existing.forEach((r) => {
          newRows[r.month - 1] = {
            cc: r.cc?.toString() || "",
            ce: r.ce?.toString() || "",
            pm: r.pm?.toString() || "",
          };
        });
        setRows(newRows);
      } else {
        setRows(emptyRows());
      }
      setHasDraft(false);
    }
  }, [mode, draftKey, existing]);

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

  // Fixed: use Array.from to create independent row objects (Array.fill shares references)
  const emptyRows = () => Array.from({ length: 12 }, () => ({ cc: "", ce: "", pm: "" }));

  const [rows, setRows] = useState(emptyRows);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    let loadedDraft = false;
    const draftStr = localStorage.getItem(draftKey);
    if (draftStr) {
      try {
        const d = JSON.parse(draftStr);
        if (Array.isArray(d) && d.length === 12) {
          setRows(d);
          loadedDraft = true;
          setHasDraft(true);
        }
      } catch (e) {
        /* corrupt draft, ignore */
      }
    }

    if (!loadedDraft) {
      if (existing && existing.length > 0) {
        const newRows = emptyRows();
        existing.forEach((r) => {
          newRows[r.month - 1] = {
            cc: r.cc?.toString() || "",
            ce: r.ce?.toString() || "",
            pm: r.pm?.toString() || "",
          };
        });
        setRows(newRows);
      } else {
        setRows(emptyRows());
      }
      setHasDraft(false);
    }
  }, [existing, agencyId, year, draftKey]);

  useEffect(() => {
    if (!existing) return;
    const isDifferent = rows.some((r, i) => {
      const ex = existing.find((x) => x.month === i + 1);
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

  const updateRow = useCallback(
    (idx: number, field: "cc" | "ce" | "pm", val: string) => {
      setRows((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], [field]: val };
        return copy;
      });
    },
    []
  );

  const clearRow = useCallback(
    (idx: number) => {
      setRows((prev) => {
        const copy = [...prev];
        copy[idx] = { cc: "", ce: "", pm: "" };
        return copy;
      });
    },
    []
  );

  const copyPreviousRow = useCallback(
    (idx: number) => {
      if (idx === 0) return;
      setRows((prev) => {
        const copy = [...prev];
        copy[idx] = { ...prev[idx - 1] };
        return copy;
      });
    },
    []
  );

  const applyQuickFill = useCallback(() => {
    if (!quickCc && !quickCe && !quickPm) return;
    setRows((prev) =>
      prev.map((r) => ({
        cc: quickCc || r.cc,
        ce: quickCe || r.ce,
        pm: quickPm || r.pm,
      }))
    );
    setQuickFillOpen(false);
    toast.success("Valeurs appliquées aux 12 mois");
  }, [quickCc, quickCe, quickPm]);

  const clearAllRows = useCallback(() => {
    setRows(emptyRows());
    toast.info("Toutes les lignes ont été vidées");
  }, []);

  // Computed values
  const monthsFilledCount = useMemo(
    () => rows.filter((r) => (Number(r.cc) || 0) > 0 || (Number(r.ce) || 0) > 0 || (Number(r.pm) || 0) > 0).length,
    [rows]
  );

  const totalCc = useMemo(() => rows.reduce((s, r) => s + (Number(r.cc) || 0), 0), [rows]);
  const totalCe = useMemo(() => rows.reduce((s, r) => s + (Number(r.ce) || 0), 0), [rows]);
  const totalPm = useMemo(() => rows.reduce((s, r) => s + (Number(r.pm) || 0), 0), [rows]);
  const totalGlobal = totalCc + totalCe + totalPm;

  const monthsToModify = useMemo(
    () =>
      mode === "add"
        ? rows.filter((r, i) => {
            const ex = existing?.find((x) => x.month === i + 1);
            return ex && ((Number(r.cc) || 0) > 0 || (Number(r.ce) || 0) > 0 || (Number(r.pm) || 0) > 0);
          }).length
        : 0,
    [mode, rows, existing]
  );

  const previews = useMemo(() => {
    if (mode !== "add" || !existing) return null;
    return rows.map((r, i) => {
      const ex = existing.find((x) => x.month === i + 1);
      if (!ex) return null;
      return {
        cc: { old: ex.cc || 0, add: Number(r.cc) || 0, total: (ex.cc || 0) + (Number(r.cc) || 0) },
        ce: { old: ex.ce || 0, add: Number(r.ce) || 0, total: (ex.ce || 0) + (Number(r.ce) || 0) },
        pm: { old: ex.pm || 0, add: Number(r.pm) || 0, total: (ex.pm || 0) + (Number(r.pm) || 0) },
      };
    });
  }, [mode, rows, existing]);

  const save = useMutation({
    mutationFn: async () => {
      if (!agencyId) throw new Error("Choisissez une agence");

      // Capture monthsToModify here for the success callback
      const modifiedCount = monthsToModify;

      const payload = rows
        .map((r, i) => {
          const base = { agency_id: agencyId, year, month: i + 1 };
          if (mode === "add") {
            const ex = existing?.find((x) => x.month === i + 1);
            return {
              ...base,
              cc: (ex?.cc || 0) + (Number(r.cc) || 0),
              ce: (ex?.ce || 0) + (Number(r.ce) || 0),
              pm: (ex?.pm || 0) + (Number(r.pm) || 0),
            };
          }
          return {
            ...base,
            cc: Number(r.cc) || 0,
            ce: Number(r.ce) || 0,
            pm: Number(r.pm) || 0,
          };
        })
        .filter((r) => r.cc > 0 || r.ce > 0 || r.pm > 0 || existing?.some((x) => x.month === r.month));

      if (payload.length > 0) {
        if (!navigator.onLine) {
          addToSyncQueue(payload);
          return { offline: true, mode, modifiedCount, savedCount: payload.length };
        }
        const { error } = await supabase.from("conventions").upsert(payload, { onConflict: "agency_id,year,month" });
        if (error) throw error;
      }
      return { offline: false, mode, modifiedCount, savedCount: payload.length };
    },
    onSuccess: (data) => {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      if (data?.offline) {
        toast.success(
          data.mode === "add"
            ? "Hors ligne : Données ajoutées enregistrées localement !"
            : "Hors ligne : Année complète enregistrée localement !"
        );
      } else {
        if (data?.mode === "add") {
          toast.success(
            `Données ajoutées avec succès ! ${data.modifiedCount} mois mis à jour, ${data.savedCount} mois enregistrés.`
          );
        } else {
          toast.success(`Année complète enregistrée ! ${data?.savedCount ?? 0} mois sauvegardés.`);
        }
      }
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = useCallback(() => {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    if (existing && existing.length > 0) {
      const newRows = emptyRows();
      existing.forEach((r) => {
        newRows[r.month - 1] = {
          cc: r.cc?.toString() || "",
          ce: r.ce?.toString() || "",
          pm: r.pm?.toString() || "",
        };
      });
      setRows(newRows);
    } else {
      setRows(emptyRows());
    }
  }, [draftKey, existing]);

  if (isLoading) {
    return (
      <div className="py-10 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-2 text-sm text-muted-foreground">Chargement des données…</p>
      </div>
    );
  }

  const existingMonthCount = existing?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{monthsFilledCount}</span> / 12 mois renseignés
          </span>
          {existingMonthCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              {existingMonthCount} mois déjà enregistrés
            </span>
          )}
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {/* Existing data layer */}
          {existingMonthCount > 0 && (
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-emerald-400/40 transition-all duration-500"
              style={{ width: `${(existingMonthCount / 12) * 100}%` }}
            />
          )}
          {/* Filled months layer */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(monthsFilledCount / 12) * 100}%` }}
          />
        </div>
      </div>

      {/* Mode selector */}
      <div className="rounded-lg border bg-card p-4">
        <Label className="mb-3 block text-sm font-semibold">Mode de saisie</Label>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "replace" | "add")} className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="replace" id="mode-replace" />
            <Label htmlFor="mode-replace" className="cursor-pointer font-normal">
              Remplacer les données
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="add" id="mode-add" />
            <Label htmlFor="mode-add" className="cursor-pointer font-normal">
              Ajouter aux données existantes
            </Label>
          </div>
        </RadioGroup>
        {mode === "add" && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200">
            <span className="text-base leading-none">🔄</span>
            <span>Les valeurs saisies seront <strong>additionnées</strong> aux données existantes de chaque mois.</span>
          </div>
        )}
      </div>

      {/* Quick-fill toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {!quickFillOpen ? (
          <Button variant="outline" size="sm" onClick={() => setQuickFillOpen(true)} className="text-xs">
            <RotateCcw className="mr-1.5 h-3 w-3" />
            Remplissage rapide
          </Button>
        ) : (
          <div className="w-full rounded-lg border bg-card p-3 shadow-sm space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Appliquer à tous les 12 mois :</span>
              <Button variant="ghost" size="sm" onClick={() => setQuickFillOpen(false)} className="h-6 px-2 text-xs">
                ✕
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">CC</Label>
                <Input
                  className="h-7 text-xs text-center"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="—"
                  value={quickCc}
                  onChange={(e) => setQuickCc(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div>
                <Label className="text-[10px]">CE</Label>
                <Input
                  className="h-7 text-xs text-center"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="—"
                  value={quickCe}
                  onChange={(e) => setQuickCe(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div>
                <Label className="text-[10px]">PM</Label>
                <Input
                  className="h-7 text-xs text-center"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="—"
                  value={quickPm}
                  onChange={(e) => setQuickPm(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 text-xs h-7" onClick={applyQuickFill}>
                Appliquer aux 12 mois
              </Button>
            </div>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={clearAllRows} className="text-xs">
          <Trash2 className="mr-1.5 h-3 w-3" />
          Tout effacer
        </Button>
      </div>

      {hasDraft && (
        <div className="flex items-center gap-2 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200">
          <span className="text-base leading-none">📝</span>
          <span className="flex-1">
            Brouillon restauré automatiquement.{" "}
            <button className="underline cursor-pointer font-semibold" onClick={resetForm}>
              Annuler et revenir aux données enregistrées
            </button>
          </span>
        </div>
      )}

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">Mois</th>
              <th className="px-2 py-2.5 text-center font-semibold text-xs uppercase tracking-wider w-[90px]">CC</th>
              <th className="px-2 py-2.5 text-center font-semibold text-xs uppercase tracking-wider w-[90px]">CE</th>
              <th className="px-2 py-2.5 text-center font-semibold text-xs uppercase tracking-wider w-[90px]">PM</th>
              <th className="px-3 py-2.5 text-right font-semibold text-xs uppercase tracking-wider w-[80px]">Total</th>
              <th className="px-2 py-2.5 text-center w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {MONTHS_FR.map((m, i) => {
              const r = rows[i];
              const preview = previews?.[i];
              const rowTotal = (Number(r.cc) || 0) + (Number(r.ce) || 0) + (Number(r.pm) || 0);
              const hasPreview = mode === "add" && preview;
              const existingRow = existing?.find((x) => x.month === i + 1);
              const hasData = rowTotal > 0;
              const isEven = i % 2 === 0;

              return (
                <tr
                  key={m}
                  className={`border-t transition-colors ${isEven ? "bg-background" : "bg-muted/10"} ${
                    hasData ? "hover:bg-primary/5" : "hover:bg-muted/20"
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-xs">
                    <div className="flex items-center gap-2">
                      {existingRow ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Données enregistrées" />
                      ) : hasData ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-amber-400 shrink-0" title="Nouvelles données" />
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/20 shrink-0" />
                      )}
                      <span>{m}</span>
                    </div>
                  </td>
                  <td className={`px-1 py-1.5 ${hasPreview && preview.cc.old > 0 ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}>
                    {mode === "add" && existingRow ? (
                      <div className="space-y-0.5">
                        <div className="h-6 flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted/30 rounded px-1">
                          {existingRow.cc || 0}
                        </div>
                        <Input
                          className="h-7 text-center px-1 text-xs tabular-nums border-emerald-300 focus:border-emerald-500"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={r.cc}
                          placeholder="+ ajouter"
                          onChange={(e) => updateRow(i, "cc", e.target.value.replace(/\D/g, ""))}
                        />
                        {preview && preview.cc.add > 0 && (
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-center tabular-nums">
                            → {preview.cc.total}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Input
                        className="h-8 text-center px-1 text-xs tabular-nums"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={r.cc}
                        placeholder="0"
                        onChange={(e) => updateRow(i, "cc", e.target.value.replace(/\D/g, ""))}
                      />
                    )}
                  </td>
                  <td className={`px-1 py-1.5 ${hasPreview && preview.ce.old > 0 ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}>
                    {mode === "add" && existingRow ? (
                      <div className="space-y-0.5">
                        <div className="h-6 flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted/30 rounded px-1">
                          {existingRow.ce || 0}
                        </div>
                        <Input
                          className="h-7 text-center px-1 text-xs tabular-nums border-emerald-300 focus:border-emerald-500"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={r.ce}
                          placeholder="+ ajouter"
                          onChange={(e) => updateRow(i, "ce", e.target.value.replace(/\D/g, ""))}
                        />
                        {preview && preview.ce.add > 0 && (
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-center tabular-nums">
                            → {preview.ce.total}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Input
                        className="h-8 text-center px-1 text-xs tabular-nums"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={r.ce}
                        placeholder="0"
                        onChange={(e) => updateRow(i, "ce", e.target.value.replace(/\D/g, ""))}
                      />
                    )}
                  </td>
                  <td className={`px-1 py-1.5 ${hasPreview && preview.pm.old > 0 ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}>
                    {mode === "add" && existingRow ? (
                      <div className="space-y-0.5">
                        <div className="h-6 flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted/30 rounded px-1">
                          {existingRow.pm || 0}
                        </div>
                        <Input
                          className="h-7 text-center px-1 text-xs tabular-nums border-emerald-300 focus:border-emerald-500"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={r.pm}
                          placeholder="+ ajouter"
                          onChange={(e) => updateRow(i, "pm", e.target.value.replace(/\D/g, ""))}
                        />
                        {preview && preview.pm.add > 0 && (
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-center tabular-nums">
                            → {preview.pm.total}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Input
                        className="h-8 text-center px-1 text-xs tabular-nums"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={r.pm}
                        placeholder="0"
                        onChange={(e) => updateRow(i, "pm", e.target.value.replace(/\D/g, ""))}
                      />
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-xs">
                    <span className={`font-semibold ${hasData ? "text-foreground" : "text-muted-foreground/40"}`}>
                      {hasData ? rowTotal.toLocaleString("fr-FR") : "—"}
                    </span>
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <div className="flex gap-0.5 justify-center">
                      {i > 0 && (
                        <button
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title={`Copier depuis ${MONTHS_FR[i - 1]}`}
                          onClick={() => copyPreviousRow(i)}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                      )}
                      {hasData && (
                        <button
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Effacer cette ligne"
                          onClick={() => clearRow(i)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-primary/20 bg-primary/5 font-semibold">
              <td className="px-3 py-3 text-xs uppercase tracking-wider">Total année</td>
              <td className="px-2 py-3 text-center text-sm tabular-nums text-primary">{totalCc > 0 ? totalCc.toLocaleString("fr-FR") : "—"}</td>
              <td className="px-2 py-3 text-center text-sm tabular-nums text-primary">{totalCe > 0 ? totalCe.toLocaleString("fr-FR") : "—"}</td>
              <td className="px-2 py-3 text-center text-sm tabular-nums text-primary">{totalPm > 0 ? totalPm.toLocaleString("fr-FR") : "—"}</td>
              <td className="px-3 py-3 text-right text-lg tabular-nums text-primary font-black">{totalGlobal > 0 ? totalGlobal.toLocaleString("fr-FR") : "—"}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-2">
        {MONTHS_FR.map((m, i) => {
          const r = rows[i];
          const rowTotal = (Number(r.cc) || 0) + (Number(r.ce) || 0) + (Number(r.pm) || 0);
          const existingRow = existing?.find((x) => x.month === i + 1);
          const preview = previews?.[i];
          const hasPreview = mode === "add" && preview;
          const hasData = rowTotal > 0;

          return (
            <div
              key={m}
              className={`rounded-lg border p-3 transition-all ${
                hasData ? "border-primary/30 bg-primary/[0.02] shadow-sm" : "bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {existingRow ? (
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="Enregistré" />
                  ) : hasData ? (
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400" title="Nouveau" />
                  ) : (
                    <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/20" />
                  )}
                  <span className="text-sm font-semibold">{m}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold tabular-nums ${hasData ? "text-primary" : "text-muted-foreground/40"}`}>
                    {hasData ? rowTotal.toLocaleString("fr-FR") : "—"}
                  </span>
                  {hasData && (
                    <button
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => clearRow(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">CC</Label>
                  <Input
                    className="h-8 text-center text-xs tabular-nums"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={r.cc}
                    placeholder="0"
                    onChange={(e) => updateRow(i, "cc", e.target.value.replace(/\D/g, ""))}
                  />
                  {hasPreview && preview.cc.add > 0 && (
                    <div className="mt-0.5 text-[9px] text-emerald-600 text-center tabular-nums">
                      {preview.cc.old}+{preview.cc.add}={preview.cc.total}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">CE</Label>
                  <Input
                    className="h-8 text-center text-xs tabular-nums"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={r.ce}
                    placeholder="0"
                    onChange={(e) => updateRow(i, "ce", e.target.value.replace(/\D/g, ""))}
                  />
                  {hasPreview && preview.ce.add > 0 && (
                    <div className="mt-0.5 text-[9px] text-emerald-600 text-center tabular-nums">
                      {preview.ce.old}+{preview.ce.add}={preview.ce.total}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">PM</Label>
                  <Input
                    className="h-8 text-center text-xs tabular-nums"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={r.pm}
                    placeholder="0"
                    onChange={(e) => updateRow(i, "pm", e.target.value.replace(/\D/g, ""))}
                  />
                  {hasPreview && preview.pm.add > 0 && (
                    <div className="mt-0.5 text-[9px] text-emerald-600 text-center tabular-nums">
                      {preview.pm.old}+{preview.pm.add}={preview.pm.total}
                    </div>
                  )}
                </div>
              </div>
              {i > 0 && !hasData && (
                <button
                  className="mt-2 w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors underline"
                  onClick={() => copyPreviousRow(i)}
                >
                  Copier depuis {MONTHS_FR[i - 1]}
                </button>
              )}
            </div>
          );
        })}

        {/* Mobile total */}
        <div className="rounded-lg bg-gradient-primary p-4 text-primary-foreground shadow-elegant">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider opacity-80">Total année</div>
              <div className="mt-1 grid grid-cols-3 gap-3 text-xs opacity-90">
                <span>CC: {totalCc.toLocaleString("fr-FR")}</span>
                <span>CE: {totalCe.toLocaleString("fr-FR")}</span>
                <span>PM: {totalPm.toLocaleString("fr-FR")}</span>
              </div>
            </div>
            <span className="text-3xl font-black tabular-nums">{totalGlobal.toLocaleString("fr-FR")}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
        {hasDraft && (
          <Button variant="outline" onClick={resetForm} disabled={save.isPending} className="sm:order-1">
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Réinitialiser
          </Button>
        )}

        {mode === "add" ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={save.isPending || !agencyId || totalGlobal === 0} className="sm:order-2">
                {save.isPending ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Enregistrement…
                  </>
                ) : (
                  "Ajouter aux données existantes"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer l'ajout aux données</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>
                      Vous allez ajouter les valeurs saisies aux données existantes pour <strong>{year}</strong>.
                    </p>
                    <div className="rounded-md bg-muted p-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Mois avec saisie :</span>
                        <strong>{monthsFilledCount}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Mois existants modifiés :</span>
                        <strong>{monthsToModify}</strong>
                      </div>
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span>Total à ajouter :</span>
                        <strong className="text-primary">{totalGlobal.toLocaleString("fr-FR")}</strong>
                      </div>
                    </div>
                    <p className="text-amber-600 dark:text-amber-400">⚠️ Cette action est irréversible.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => save.mutate()}>Confirmer l'ajout</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={save.isPending || !agencyId || totalGlobal === 0} className="sm:order-2">
                {save.isPending ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Enregistrement…
                  </>
                ) : (
                  "Enregistrer l'année"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Enregistrer les données de {year}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>
                      Vous allez enregistrer les données pour <strong>{monthsFilledCount} mois</strong> de l'année <strong>{year}</strong>.
                    </p>
                    <div className="rounded-md bg-muted p-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Total CC :</span>
                        <strong>{totalCc.toLocaleString("fr-FR")}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Total CE :</span>
                        <strong>{totalCe.toLocaleString("fr-FR")}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Total PM :</span>
                        <strong>{totalPm.toLocaleString("fr-FR")}</strong>
                      </div>
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span>Total global :</span>
                        <strong className="text-primary">{totalGlobal.toLocaleString("fr-FR")}</strong>
                      </div>
                    </div>
                    {existingMonthCount > 0 && (
                      <p className="text-amber-600 dark:text-amber-400">
                        ⚠️ {existingMonthCount} mois existants seront remplacés.
                      </p>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => save.mutate()}>Confirmer l'enregistrement</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

