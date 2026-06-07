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

  useEffect(() => {
    void loadAvailableMatches();
  }, [loadAvailableMatches]);

  useWebsocket({
    gameId: selectedGameId ?? "",
    enabled: selectedGameId !== null,
  });

  return <RouterProvider router={router} />;
}

export default App;
