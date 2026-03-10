import { Outlet } from "react-router-dom";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

function MobileTrigger() {
  const { toggleSidebar } = useSidebar();
  
  return (
    <div className="flex items-center gap-2 border-b px-4 py-2 md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="size-7"
      >
        <ChevronRight className="size-4" />
        <span className="sr-only">Open Sidebar</span>
      </Button>
    </div>
  );
}

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col w-full h-screen">
        {/* Mobile trigger - only visible on small screens */}
        <MobileTrigger />
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
