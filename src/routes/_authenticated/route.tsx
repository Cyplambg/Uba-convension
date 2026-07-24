import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { session, loading, user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const lastScrollY = useRef(0);
  const [headerHidden, setHeaderHidden] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      const sy = window.scrollY;
      if (sy > 60 && sy > lastScrollY.current + 10) {
        setHeaderHidden(true);
      } else if (sy < lastScrollY.current - 10 || sy < 60) {
        setHeaderHidden(false);
      }
      lastScrollY.current = sy;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement…</div>;
  }

  const initials = (profile?.full_name || user?.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={`no-print fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-4 transition-transform duration-300 md:static md:translate-y-0 ${
              headerHidden ? "-translate-y-full" : "translate-y-0"
            }`}
          >
            <div className="hidden md:block"><SidebarTrigger /></div>
            <img src="/logo.jpg" alt="Logo" className="h-7 w-auto object-contain" />
            <div className="font-semibold tracking-tight">UBA Archives</div>
            <div className="ml-auto md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Profil"
                    className="h-9 w-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    {initials ? (
                      <span className="text-xs font-bold">{initials}</span>
                    ) : (
                      <UserRound className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="truncate text-sm font-semibold">{profile?.full_name || "Utilisateur"}</div>
                    <div className="truncate text-xs font-normal text-muted-foreground">{user?.email}</div>
                    <div className="mt-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      {role === "admin" ? "Administrateur" : "Agent"}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 bg-background pt-14 md:pt-0 pb-24 md:pb-0">
            <Outlet />
          </main>
        </div>
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
