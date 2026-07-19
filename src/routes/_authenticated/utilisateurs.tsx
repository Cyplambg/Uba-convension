import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, UserCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated/utilisateurs")({
  component: Utilisateurs,
});

type Row = {
  id: string;
  full_name: string | null;
  agency_id: string | null;
  role: AppRole | null;
};

function Utilisateurs() {
  const { role: myRole, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!loading && myRole !== "admin") navigate({ to: "/dashboard", replace: true });
  }, [loading, myRole, navigate]);

  const { data: agencies } = useQuery({
    queryKey: ["agencies"],
    queryFn: async () => (await supabase.from("agencies").select("id, name, code").order("name")).data ?? [],
  });

  const { data: rows } = useQuery({
    queryKey: ["users-admin"],
    enabled: myRole === "admin",
    queryFn: async (): Promise<Row[]> => {
      const [{ data: profs }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, agency_id").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const rMap = new Map<string, AppRole>();
      (roles ?? []).forEach((r) => {
        const cur = rMap.get(r.user_id);
        // admin wins over agent
        if (r.role === "admin" || !cur) rMap.set(r.user_id, r.role as AppRole);
      });
      return (profs ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        agency_id: p.agency_id,
        role: rMap.get(p.id) ?? null,
      }));
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows ?? [];
    return (rows ?? []).filter(
      (r) => (r.full_name ?? "").toLowerCase().includes(s) || r.id.toLowerCase().includes(s),
    );
  }, [rows, q]);

  const setAgency = useMutation({
    mutationFn: async ({ userId, agencyId }: { userId: string; agencyId: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ agency_id: agencyId })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agence mise à jour");
      qc.invalidateQueries({ queryKey: ["users-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      qc.invalidateQueries({ queryKey: ["users-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (myRole !== "admin") return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground">
          Attribuez une agence et un rôle aux comptes inscrits.
        </p>
      </div>

      <Card className="p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom…"
            className="max-w-sm"
          />
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aucun utilisateur.
            </div>
          )}
          {filtered.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-1 gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_1fr]"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                  <UserCog className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {u.full_name ?? "(sans nom)"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-[10px]">
                      {u.role ?? "aucun rôle"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">Agence</Label>
                <Select
                  value={u.agency_id ?? "none"}
                  onValueChange={(v) =>
                    setAgency.mutate({ userId: u.id, agencyId: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucune —</SelectItem>
                    {(agencies ?? []).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">Rôle</Label>
                <Select
                  value={u.role ?? "agent"}
                  onValueChange={(v) => setRole.mutate({ userId: u.id, role: v as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent Archiviste</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
