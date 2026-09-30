import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PencilLine, Building2, BarChart3, Table, LogOut, Users, CalendarDays } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export function AppSidebar() {
  const { role, profile, user, signOut } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });

  const items = [
    { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
    { title: "Saisie mensuelle", url: "/saisie", icon: PencilLine },
    { title: "Tableau annuel", url: "/tableau", icon: Table },
    { title: "Statistiques", url: "/statistiques", icon: BarChart3 },
    { title: "Rapports", url: "/rapports", icon: CalendarDays },
    ...(role === "admin"
      ? [
          { title: "Agences", url: "/agences", icon: Building2 },
          { title: "Utilisateurs", url: "/utilisateurs", icon: Users },
        ]
      : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <img src="/logo.png" alt="UBA Archives" className="h-8 w-8 shrink-0 object-contain" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-bold text-sidebar-foreground">UBA Archives</div>
            <div className="truncate text-xs text-sidebar-foreground/60">Conventions</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path === item.url}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
          <div className="truncate text-xs text-sidebar-foreground/60">{user?.email}</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
              {role === "admin" ? "Administrateur" : "Agent"}
            </span>
            <div className="flex items-center gap-1">
              <ModeToggle />
              <Button size="sm" variant="ghost" onClick={signOut} className="h-7 px-2 text-sidebar-foreground hover:bg-sidebar-accent">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {profile?.full_name && <div className="mt-1 truncate text-xs text-sidebar-foreground">{profile.full_name}</div>}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
