import { createFileRoute, useNavigate, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const { session, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (session) return <Navigate to="/dashboard" />;

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Connecté");
    navigate({ to: "/dashboard" });
  };

  const doSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Compte créé");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md p-6 shadow-elegant">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground font-black">Z</div>
          <span className="font-bold tracking-tight">Zouane Conventions</span>
        </Link>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Créer un compte</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={doLogin} className="space-y-3 pt-4">
              <div>
                <Label htmlFor="l-email">Email</Label>
                <Input id="l-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="l-pwd">Mot de passe</Label>
                <Input id="l-pwd" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "…" : "Se connecter"}</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={doSignup} className="space-y-3 pt-4">
              <div>
                <Label htmlFor="s-name">Nom complet</Label>
                <Input id="s-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="s-email">Email</Label>
                <Input id="s-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="s-pwd">Mot de passe (min. 6 caractères)</Label>
                <Input id="s-pwd" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "…" : "Créer mon compte"}</Button>
              <p className="text-center text-xs text-muted-foreground">
                Le premier compte créé devient Administrateur.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
