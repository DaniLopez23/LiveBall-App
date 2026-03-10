import { NavLink, useLocation } from "react-router-dom";
import { Home, BarChart3, Network, Zap, HelpCircle, User, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Button } from "@/components/ui/button";

const menuItems = [
  { id: "home", label: "Inicio", icon: Home, path: "/" },
  { id: "estadisticas", label: "Estadísticas", icon: BarChart3, path: "/stats" },
  { id: "redes-pases", label: "Redes de Pases", icon: Network, path: "/pass-networks" },
  { id: "eventos", label: "Eventos", icon: Zap, path: "/events" },
];

const footerItems = [
  { id: "help", label: "Ayuda", icon: HelpCircle, path: "/ayuda" },
  { id: "user", label: "Usuario", icon: User, path: "/usuario" },
];

export function AppSidebar() {
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          {/* Toggle button - desktop only */}
          <SidebarMenuItem className="hidden md:block">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="size-7"
            >
              {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          </SidebarMenuItem>
          
          {/* Logo */}
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <img
                  src="/app_logo.PNG"
                  alt="LiveBall logo"
                  className="size-8 shrink-0 rounded-md object-contain"
                />
                <span className="font-semibold text-base truncate">LiveBall</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive =
                  item.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <NavLink to={item.path}>
                        <item.icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          {footerItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                  <NavLink to={item.path}>
                    <item.icon />
                    <span>{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
