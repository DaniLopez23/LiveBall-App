import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { OptaEvent } from "@/components/pitch/figures/OptaMarkers";
import type { EventSequence } from "@/components/pitch/eventsPitch/eventSequences";
import {
  formatEventTime,
  getActionLabel,
  getTeamName,
} from "@/components/pitch/eventsPitch/eventDisplay";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";

const PAGE_SIZE = 50;

interface EventsPitchSequencesTableProps {
  sequences: EventSequence[];
  selectedSequenceId: string | null;
  onSelectedSequenceIdChange: (sequenceId: string | null) => void;
  game?: Game | null;
}

const getSequenceEndEvent = (sequence: EventSequence): OptaEvent | null =>
  sequence.events[sequence.events.length - 1] ?? null;

const getEventSortValue = (event: OptaEvent | null): number =>
  (event?.period_id ?? 0) * 10000 + (event?.min ?? 0) * 60 + (event?.sec ?? 0);

const EventsPitchSequencesTable: React.FC<EventsPitchSequencesTableProps> = ({
  sequences,
  selectedSequenceId,
  onSelectedSequenceIdChange,
  game,
}) => {
  const [page, setPage] = useState(0);

  React.useEffect(() => {
    setPage(0);
  }, [sequences]);

  const totalPages = Math.max(1, Math.ceil(sequences.length / PAGE_SIZE));
  const orderedSequences = sequences
    .map((sequence, index) => ({ sequence, index, endEvent: getSequenceEndEvent(sequence) }))
    .sort(
      (left, right) =>
        getEventSortValue(right.endEvent) - getEventSortValue(left.endEvent) ||
        right.index - left.index,
    )
    .map(({ sequence }) => sequence);
  const pageSequences = orderedSequences.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border">
      <div className="[&>div]:max-h-[min(62svh,42rem)] [&>div]:overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 bg-background *:whitespace-nowrap after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border after:content-['']">
              <TableHead>Tiempo</TableHead>
              <TableHead className="w-12 text-center">Ver</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Accion que la termina</TableHead>
              <TableHead>Accion precedente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-hidden">
            {sequences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
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
                    <TableCell className="tabular-nums text-xs">
                      {endEvent ? formatEventTime(endEvent.min, endEvent.sec) : "-"}
                    </TableCell>
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
                    <TableCell className="text-xs">
                      {getTeamName(game, sequence.teamId)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {endEvent ? getActionLabel(endEvent.type_id) : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {sequence.precedingEvent ? getActionLabel(sequence.precedingEvent.type_id) : "-"}
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
    </div>
  );
};

export default EventsPitchSequencesTable;
