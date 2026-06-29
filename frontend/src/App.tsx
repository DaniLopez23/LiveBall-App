import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import useWebsocket from "@/hooks/useWebsocket";
import useMatchSelectionStore from "@/store/matchSelectionStore";

function App() {
  const selectedGameId = useMatchSelectionStore((state) => state.selectedGameId);
  const loadAvailableMatches = useMatchSelectionStore(
    (state) => state.loadAvailableMatches,
  );
  const matchesLoadStatus = useMatchSelectionStore((state) => state.loadStatus);

  useEffect(() => {
    void loadAvailableMatches();
  }, [loadAvailableMatches]);

  useEffect(() => {
    if (matchesLoadStatus !== "error") return;

    const retryId = window.setTimeout(() => {
      void loadAvailableMatches(true);
    }, 3_000);

    return () => window.clearTimeout(retryId);
  }, [loadAvailableMatches, matchesLoadStatus]);

  useWebsocket({
    gameId: selectedGameId ?? "",
    enabled: selectedGameId !== null,
  });

  return <RouterProvider router={router} />;
}

export default App;
