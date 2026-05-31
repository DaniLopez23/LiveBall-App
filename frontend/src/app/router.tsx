import { createBrowserRouter } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import DashboardSummaryPage from "@/features/dashboard/pages/DashboardSummaryPage";
import EventsPage from "@/pages/EventsPage";
import PassNetworkPage from "@/pages/PassNetworkPage";
import StatsPage from "@/pages/StatsPage";

// Pages (uncomment as they are created)
// import { HomePage }         from "@/components/pages/HomePage";
// import { EstadisticasPage } from "@/components/pages/EstadisticasPage";
// import { RedesPasesPage }   from "@/components/pages/RedesPasesPage";
// import { EventosPage }      from "@/components/pages/EventosPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <div className="p-6 text-muted-foreground">Inicio – próximamente</div>,
        // element: <HomePage />,
      },
      {
        path: "dashboard",
        element: <DashboardSummaryPage />,
      },
      {
        path: "stats",
        element: <StatsPage />,
        // element: <EstadisticasPage />,
      },
      {
        path: "pass-networks",
        element: <PassNetworkPage />,
      },
      {
        path: "events",
        element: <EventsPage />
      },
    ],
  },
]);
