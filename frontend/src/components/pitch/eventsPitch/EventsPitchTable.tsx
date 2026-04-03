import React, { useState } from "react";
import { Info, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PITCH_EVENT_TYPES_CONFIG, OUTCOME_OPTIONS_FLAT } from "@/types/outcomeOptions";
import type { OptaEvent } from "@/components/pitch/figures/OptaMarkers";
import type { Game } from "@/types/game";
import EventsPitchModalDetail from "@/components/pitch/eventsPitch/EventsPitchModalDetail";

const PAGE_SIZE = 15;

interface EventsPitchTableProps {
  events: OptaEvent[];
  sequenceEvents?: OptaEvent[];
  game?: Game | null;
}

function getActionLabel(typeId: string): string {
  const config = PITCH_EVENT_TYPES_CONFIG.find(
    (c) => c.value !== "all" && c.typeIds.includes(typeId)
  );
  return config?.label ?? typeId;
}

function getOutcomeLabel(typeId: string, outcome: number | string | null | undefined): string {
  const match = OUTCOME_OPTIONS_FLAT.find(
    (opt) =>
      opt.typeId === typeId &&
      (opt.outcome === undefined || String(opt.outcome) === String(outcome))
  );
  return match?.label ?? (outcome != null ? String(outcome) : "—");
}

function formatTime(min?: number | null, sec?: number | null): string {
  if (min == null) return "—";
  const mm = String(min).padStart(2, "0");
  const ss = String(sec ?? 0).padStart(2, "0");
  return `${mm}:${ss}`;
}

const EventsPitchTable: React.FC<EventsPitchTableProps> = ({ events, sequenceEvents, game }) => {
  const [page, setPage] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<OptaEvent | null>(null);
  const modalSequenceEvents = sequenceEvents ?? events;

  // Reset to first page when events change
  React.useEffect(() => { setPage(0); }, [events]);

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const reversed = [...events].reverse();
  const pageEvents = reversed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const teamNameById = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (game) {
      map[game.home_team.team_id] = game.home_team.team_name;
      map[game.away_team.team_id] = game.away_team.team_name;
    }
    return map;
  }, [game]);

  const selectedActionLabel = selectedEvent ? getActionLabel(selectedEvent.type_id) : "";
  const selectedOutcomeLabel = selectedEvent
    ? getOutcomeLabel(selectedEvent.type_id, selectedEvent.outcome)
    : "";

  return (
    <div className="flex flex-col rounded-lg border overflow-hidden">
      {/* The [&>div] targets the inner wrapper div that Table renders */}
      <div className="[&>div]:max-h-80 [&>div]:overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 bg-background *:whitespace-nowrap after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border after:content-['']">
              <TableHead>Jugador</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Tiempo</TableHead>
              <TableHead className="w-10 text-center">Mas Información</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-hidden">
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  Sin eventos para mostrar
                </TableCell>
              </TableRow>
            ) : (
              pageEvents.map((event, idx) => (
                <TableRow
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedEvent(event);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-slate-600",
                    idx % 2 === 0
                      ? "bg-white dark:bg-slate-700"
                      : "bg-slate-50 dark:bg-slate-750",
                  )}
                >
                  <TableCell className="font-mono text-xs">
                    {event.player_id ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {event.team_id ? (teamNameById[event.team_id] ?? event.team_id) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {getActionLabel(event.type_id)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {getOutcomeLabel(event.type_id, event.outcome)}
                  </TableCell>
                  <TableCell className="tabular-nums text-xs">
                    {formatTime(event.min, event.sec)}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
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

      {/* Pagination bar */}
      <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
        <span>
          {events.length === 0
            ? "0 eventos"
            : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, events.length)} de ${events.length}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-1">{page + 1} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Página siguiente"
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