import { createBrowserRouter } from "react-router-dom";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RequireSelectedMatch } from "@/components/routing/RequireSelectedMatch";
import DashboardSummaryPage from "@/features/dashboard/pages/DashboardSummaryPage";
import EventsPage from "@/pages/EventsPage";
import HomePage from "@/pages/HomePage";
import PassNetworkPage from "@/pages/PassNetworkPage";
import StatsPage from "@/pages/StatsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "dashboard",
        element: (
          <RequireSelectedMatch>
            <DashboardSummaryPage />
          </RequireSelectedMatch>
        ),
      },
      {
        path: "stats",
        element: (
          <RequireSelectedMatch>
            <StatsPage />
          </RequireSelectedMatch>
        ),
      },
      {
        path: "pass-networks",
        element: (
          <RequireSelectedMatch>
            <PassNetworkPage />
          </RequireSelectedMatch>
        ),
      },
      {
        path: "events",
        element: (
          <RequireSelectedMatch>
            <EventsPage />
          </RequireSelectedMatch>
        ),
      },
    ],
  },
]);
