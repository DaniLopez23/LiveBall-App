import { createBrowserRouter } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import EventsPage from "@/pages/EventsPage";

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
        path: "stats",
        element: <div className="p-6 text-muted-foreground">Estadísticas – próximamente</div>,
        // element: <EstadisticasPage />,
      },
      {
        path: "pass-networks",
        element: <div className="p-6 text-muted-foreground">Redes de Pases – próximamente</div>,
        // element: <RedesPasesPage />,
      },
      {
        path: "events",
        element: <EventsPage />
      },
    ],
  },
]);
