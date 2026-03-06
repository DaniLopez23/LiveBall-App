import React from "react";
import useWebsocket from "@/hooks/useWebsocket";

const GAME_ID = "2372222";

const EventsPage: React.FC = () => {
  const { status, isConnected, error, lastMessage } = useWebsocket({
    gameId: GAME_ID,
    enabled: true,
  });

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div>
        <h1 className="text-2xl font-bold">Eventos en Tiempo Real</h1>
        <p className="text-sm text-muted-foreground">
          WebSocket room: <span className="font-mono">{GAME_ID}</span>
        </p>
      </div>

      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Estado de Conexión</h2>
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">Estado:</span>{" "}
            <span
              className={
                status === "connected"
                  ? "text-green-600"
                  : status === "error"
                    ? "text-red-600"
                    : "text-yellow-600"
              }
            >
              {status}
            </span>
          </p>
          <p>
            <span className="font-medium">Conectado:</span>{" "}
            {isConnected ? "✅ Sí" : "❌ No"}
          </p>
          {error && (
            <p className="text-red-600">
              <span className="font-medium">Error:</span> {error}
            </p>
          )}
        </div>
      </div>

      {lastMessage && (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Último Mensaje</h2>
          <div className="text-sm">
            <p className="mb-2">
              <span className="font-medium">Tipo:</span>{" "}
              <span className="font-mono">{lastMessage.type}</span>
            </p>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(lastMessage, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        💡 Los mensajes también se imprimen en la consola del navegador
      </div>
    </div>
  );
};

export default EventsPage;
