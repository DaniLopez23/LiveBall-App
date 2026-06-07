import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import useMatchSelectionStore from "@/store/matchSelectionStore";

export function RequireSelectedMatch({ children }: { children: ReactNode }) {
  const selectedGameId = useMatchSelectionStore((state) => state.selectedGameId);
  return selectedGameId ? children : <Navigate to="/" replace />;
}
