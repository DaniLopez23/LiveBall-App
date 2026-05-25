import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

import type { OptaEvent } from "@/components/pitch/figures/OptaMarkers";
import EventsPitchModalDetail from "@/components/pitch/eventsPitch/EventsPitchModalDetail";
import {
  formatEventTime,
  formatPlayerLabel,
  getActionLabel,
  getEventUniqueId,
  getOutcomeLabel,
  getTeamName,
} from "@/components/pitch/eventsPitch/eventDisplay";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";

const PAGE_SIZE = 15;

interface EventsPitchTableProps {
  events: OptaEvent[];
  sequenceEvents?: OptaEvent[];
  game?: Game | null;
}

const EventsPitchTable: React.FC<EventsPitchTableProps> = ({ events, sequenceEvents, game }) => {
  const [page, setPage] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<OptaEvent | null>(null);
  const modalSequenceEvents = sequenceEvents ?? events;

  React.useEffect(() => {
    setPage(0);
  }, [events]);

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const reversed = [...events].reverse();
  const pageEvents = reversed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedActionLabel = selectedEvent ? getActionLabel(selectedEvent.type_id) : "";
  const selectedOutcomeLabel = selectedEvent
    ? getOutcomeLabel(selectedEvent.type_id, selectedEvent.outcome)
    : "";

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border">
      <div className="[&>div]:max-h-[min(62svh,42rem)] [&>div]:overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 bg-background *:whitespace-nowrap after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border after:content-['']">
              <TableHead>ID evento</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Accion</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Tiempo</TableHead>
              <TableHead className="w-10 text-center">Mas informacion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-hidden">
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  Sin eventos para mostrar
                </TableCell>
              </TableRow>
            ) : (
              pageEvents.map((event, idx) => (
                <TableRow
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                      keyboardEvent.preventDefault();
                      setSelectedEvent(event);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-slate-600",
                    idx % 2 === 0 ? "bg-white dark:bg-slate-700" : "bg-slate-50 dark:bg-slate-750",
                  )}
                >
                  <TableCell className="max-w-52 truncate font-mono text-xs">
                    {getEventUniqueId(event)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatPlayerLabel(event)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {getTeamName(game, event.team_id)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {getActionLabel(event.type_id)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {getOutcomeLabel(event.type_id, event.outcome)}
                  </TableCell>
                  <TableCell className="tabular-nums text-xs">
                    {formatEventTime(event.min, event.sec)}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      aria-label="Ver detalle"
                    >
                      <Info className="size-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
        <span>
          {events.length === 0
            ? "0 eventos"
            : `${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, events.length)} de ${events.length}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={page === 0}
            className="inline-flex items-center justify-center rounded-md p-1 transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-40"
            aria-label="Pagina anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-1">{page + 1} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex items-center justify-center rounded-md p-1 transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-40"
            aria-label="Pagina siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <EventsPitchModalDetail
        open={selectedEvent != null}
        event={selectedEvent}
        events={modalSequenceEvents}
        game={game}
        actionLabel={selectedActionLabel}
        outcomeLabel={selectedOutcomeLabel}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
};

export default EventsPitchTable;
