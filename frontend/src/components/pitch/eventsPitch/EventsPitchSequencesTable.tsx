import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

import type { OptaEvent } from "@/components/pitch/figures/OptaMarkers";
import EventsPitchModalDetail from "@/components/pitch/eventsPitch/EventsPitchModalDetail";
import type { EventSequence } from "@/components/pitch/eventsPitch/eventSequences";
import {
  formatEventTime,
  getActionLabel,
  getEventUniqueId,
  getOutcomeLabel,
  getTeamName,
} from "@/components/pitch/eventsPitch/eventDisplay";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";

const PAGE_SIZE = 12;

interface EventsPitchSequencesTableProps {
  sequences: EventSequence[];
  selectedSequenceId: string | null;
  onSelectedSequenceIdChange: (sequenceId: string | null) => void;
  game?: Game | null;
}

const getSequenceEndEvent = (sequence: EventSequence): OptaEvent | null =>
  sequence.events[sequence.events.length - 1] ?? null;

const EventsPitchSequencesTable: React.FC<EventsPitchSequencesTableProps> = ({
  sequences,
  selectedSequenceId,
  onSelectedSequenceIdChange,
  game,
}) => {
  const [page, setPage] = useState(0);
  const [detailSequence, setDetailSequence] = useState<EventSequence | null>(null);

  React.useEffect(() => {
    setPage(0);
  }, [sequences]);

  const totalPages = Math.max(1, Math.ceil(sequences.length / PAGE_SIZE));
  const reversed = [...sequences].reverse();
  const pageSequences = reversed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const detailEndEvent = detailSequence ? getSequenceEndEvent(detailSequence) : null;
  const detailOutcomeLabel = detailEndEvent
    ? getOutcomeLabel(detailEndEvent.type_id, detailEndEvent.outcome)
    : "";

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border">
      <div className="[&>div]:max-h-[min(62svh,42rem)] [&>div]:overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 bg-background *:whitespace-nowrap after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border after:content-['']">
              <TableHead className="w-12 text-center">Ver</TableHead>
              <TableHead>ID evento final</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Accion que la termina</TableHead>
              <TableHead>Accion precedente</TableHead>
              <TableHead>Minuto</TableHead>
              <TableHead className="w-10 text-center">Mas informacion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-hidden">
            {sequences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  Sin secuencias para mostrar
                </TableCell>
              </TableRow>
            ) : (
              pageSequences.map((sequence, idx) => {
                const endEvent = getSequenceEndEvent(sequence);
                const isSelected = selectedSequenceId === sequence.id;

                return (
                  <TableRow
                    key={sequence.id}
                    onClick={() => onSelectedSequenceIdChange(isSelected ? null : sequence.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectedSequenceIdChange(isSelected ? null : sequence.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-slate-600",
                      isSelected && "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/45",
                      !isSelected && (idx % 2 === 0 ? "bg-white dark:bg-slate-700" : "bg-slate-50 dark:bg-slate-750"),
                    )}
                  >
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectedSequenceIdChange(isSelected ? null : sequence.id);
                        }}
                        className={cn(
                          "inline-flex size-5 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected
                            ? "border-emerald-400 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]"
                            : "border-muted-foreground/40 bg-muted hover:border-emerald-400",
                        )}
                        aria-label={isSelected ? "Ocultar secuencia" : "Mostrar secuencia"}
                        aria-pressed={isSelected}
                      >
                        <span className={cn("size-2 rounded-full", isSelected ? "bg-white" : "bg-muted-foreground/45")} />
                      </button>
                    </TableCell>
                    <TableCell className="max-w-52 truncate font-mono text-xs">
                      {endEvent ? getEventUniqueId(endEvent) : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {getTeamName(game, sequence.teamId)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {endEvent ? getActionLabel(endEvent.type_id) : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {sequence.precedingEvent ? getActionLabel(sequence.precedingEvent.type_id) : "-"}
                    </TableCell>
                    <TableCell className="tabular-nums text-xs">
                      {endEvent ? formatEventTime(endEvent.min, endEvent.sec) : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDetailSequence(sequence);
                        }}
                        className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                        aria-label="Ver detalle de secuencia"
                      >
                        <Info className="size-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
        <span>
          {sequences.length === 0
            ? "0 secuencias"
            : `${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, sequences.length)} de ${sequences.length}`}
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
        open={detailSequence != null}
        event={detailEndEvent}
        events={detailSequence?.events ?? []}
        contextEventsOverride={detailSequence?.events}
        highlightSelectedEvent={false}
        game={game}
        actionLabel={detailEndEvent ? getActionLabel(detailEndEvent.type_id) : ""}
        outcomeLabel={detailOutcomeLabel}
        onClose={() => setDetailSequence(null)}
      />
    </div>
  );
};

export default EventsPitchSequencesTable;
