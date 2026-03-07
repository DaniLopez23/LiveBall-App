import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import useWebsocket from "@/hooks/useWebsocket";

const GAME_ID = "2372222";

function App() {
  useWebsocket({
    gameId: GAME_ID,
    enabled: true,
  });

  return <RouterProvider router={router} />;
}

export default App;
