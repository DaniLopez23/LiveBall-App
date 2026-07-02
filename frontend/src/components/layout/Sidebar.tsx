import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Home,
  LayoutDashboard,
  Network,
  User,
  Zap,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import useMatchSelectionStore from "@/store/matchSelectionStore";

const menuItems = [
  { id: "home", label: "Inicio", icon: Home, path: "/", requiresMatch: false },
  {
    id: "dashboard",
    label: "Resumen",
    icon: LayoutDashboard,
    path: "/dashboard",
    requiresMatch: true,
  },
  {
    id: "estadisticas",
    label: "Estadísticas",
    icon: BarChart3,
    path: "/stats",
    requiresMatch: true,
  },
  {
    id: "redes-pases",
    label: "Redes de Pases",
    icon: Network,
    path: "/pass-networks",
    requiresMatch: true,
  },
  {
    id: "eventos",
    label: "Eventos",
    icon: Zap,
    path: "/events",
    requiresMatch: true,
  },
];

const footerItems = [
  { id: "help", label: "Ayuda", icon: HelpCircle, path: "/ayuda", disabled: false },
  { id: "user", label: "Usuario", icon: User, path: "/usuario", disabled: true },
];

export function AppSidebar() {
  const location = useLocation();
  const selectedGameId = useMatchSelectionStore((state) => state.selectedGameId);
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="hidden md:block">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="size-7"
            >
              {isCollapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <img
                  src="/app_logo.PNG"
                  alt="LiveBall logo"
                  className="size-8 shrink-0 rounded-md object-contain"
                />
                <span className="truncate text-base font-semibold">LiveBall</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isDisabled = item.requiresMatch && !selectedGameId;
                const isActive =
                  item.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.path);

                return (
                  <SidebarMenuItem key={item.id}>
                    {isDisabled ? (
                      <SidebarMenuButton
                        disabled
                        tooltip={`${item.label}: selecciona un partido primero`}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <NavLink to={item.path}>
                          <item.icon />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {footerItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <SidebarMenuItem key={item.id}>
                {item.disabled ? (
                  <SidebarMenuButton disabled tooltip={`${item.label}: no disponible`}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                  >
                    <NavLink to={item.path}>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
