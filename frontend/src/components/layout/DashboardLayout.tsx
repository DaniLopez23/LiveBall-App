import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
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
      <SidebarInset>
        <div className="flex flex-col h-full">
          {/* Mobile trigger - only visible on small screens */}
          <MobileTrigger />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
