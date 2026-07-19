import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agences")({
  component: AgencesPage,
});

interface AgencyForm {
  id?: string;
  name: string;
  code: string;
  address: string;
  city: string;
  status: string;
}

const empty: AgencyForm = { name: "", code: "", address: "", city: "", status: "active" };

function AgencesPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AgencyForm>(empty);

  const { data: agencies } = useQuery({
    queryKey: ["agencies-all"],
    queryFn: async () => (await supabase.from("agencies").select("*").order("name")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (f: AgencyForm) => {
      if (f.id) {
        const { error } = await supabase.from("agencies").update({
          name: f.name, code: f.code, address: f.address, city: f.city, status: f.status,
        }).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agencies").insert({
          name: f.name, code: f.code, address: f.address, city: f.city, status: f.status,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Enregistré");
      qc.invalidateQueries({ queryKey: ["agencies-all"] });
      qc.invalidateQueries({ queryKey: ["agencies"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agence supprimée");
      qc.invalidateQueries({ queryKey: ["agencies-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (agencies ?? []).filter((a) =>
    [a.name, a.code, a.city].filter(Boolean).some((v) => v!.toLowerCase().includes(search.toLowerCase()))
  );

  if (role !== "admin") {
    return <div className="p-8 text-center text-muted-foreground">Accès réservé aux administrateurs.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">Agences</h1>
          <p className="text-sm text-muted-foreground">{agencies?.length ?? 0} agence(s) enregistrée(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(empty)}><Plus className="mr-1 h-4 w-4" /> Nouvelle agence</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Modifier" : "Ajouter"} une agence</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
                <div><Label>Statut</Label><Input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} placeholder="active" /></div>
              </div>
              <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.name || !form.code}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 shadow-card">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher une agence, code ou ville…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">Ville</TableHead>
                <TableHead className="hidden md:table-cell">Adresse</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.code}</TableCell>
                  <TableCell className="hidden md:table-cell">{a.city}</TableCell>
                  <TableCell className="hidden md:table-cell">{a.address}</TableCell>
                  <TableCell><Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setForm({ id: a.id, name: a.name, code: a.code, address: a.address ?? "", city: a.city ?? "", status: a.status }); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Supprimer ${a.name} ?`)) del.mutate(a.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Aucun résultat</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
