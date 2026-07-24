import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PencilLine, Building2, BarChart3, Table, Users, MoreHorizontal, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";

export function MobileNav() {
  const { role } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const sy = window.scrollY;
      if (sy > 100 && sy > lastScrollY.current + 10) {
        setHidden(true);
      } else if (sy < lastScrollY.current - 10 || sy < 100) {
        setHidden(false);
      }
      lastScrollY.current = sy;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const primary = [
    { url: "/dashboard", icon: LayoutDashboard, label: "Tableau" },
    { url: "/saisie", icon: PencilLine, label: "Saisie" },
    { url: "/tableau", icon: Table, label: "Annuel" },
    { url: "/statistiques", icon: BarChart3, label: "Stats" },
  ];
  const admin = role === "admin"
    ? [
        { url: "/agences", icon: Building2, label: "Agences" },
        { url: "/utilisateurs", icon: Users, label: "Utilisateurs" },
      ]
    : [];

  const items = expanded ? [...primary, ...admin] : primary;

  return (
    <nav
      className={cn(
        "no-print pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 transition-all duration-300 md:hidden",
        hidden ? "translate-y-20 opacity-0" : "translate-y-0 opacity-100",
      )}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/90 px-2 py-2 shadow-2xl backdrop-blur-xl">
        <div className="mr-1 text-white dark:text-white">
          <ModeToggle />
        </div>
        <div className="h-6 w-px bg-white/10" />
        {items.map((it) => {
          const active = path === it.url;
          return (
            <Link
              key={it.url}
              to={it.url}
              aria-label={it.label}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-white/70 hover:text-white hover:bg-white/10",
              )}
            >
              <it.icon className="h-[18px] w-[18px]" />
            </Link>
          );
        })}
        {admin.length > 0 && (
          <>
            <div className="mx-1 h-6 w-px bg-white/10" />
            <button
              type="button"
              aria-label={expanded ? "Réduire" : "Plus"}
              onClick={() => setExpanded((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              {expanded ? <ChevronRight className="h-[18px] w-[18px]" /> : <MoreHorizontal className="h-[18px] w-[18px]" />}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
