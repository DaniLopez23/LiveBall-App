import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import PassNetworkNoDataOverlay from "./PassNetworkNoDataOverlay";
import PassNetworkCaptureModal from "./PassNetworkCaptureModal";
import PassNetworkPitchBoard from "./PassNetworkPitchBoard";
import { PassNetworkPitchHeader } from "./PassNetworkPitchHeader";
import type { Orientation } from "@/store/optaPitchConfigStore";
import type { PassNetworkNode, PassNetworkEdge } from "@/types/passNetwork";

interface PassNetworkPitchProps {
  nodes: PassNetworkNode[];
  edges: PassNetworkEdge[];
  /** Hex/css color for the team's graph elements */
  color?: string;
  /** Pitch orientation */
  orientation?: Orientation;
  /** Mirrors Opta X (length axis) so a team can be shown on the opposite half */
  mirrorX?: boolean;
  /** Pitch surface color */
  fieldColor?: string;
  /** When true, elements animate in on mount/update */
  animated?: boolean;
  /** When provided, shows a dark overlay message over the pitch */
  noDataMessage?: string;
  /** Show header section above the pitch (default: true). */
  showHeader?: boolean;
  /** Team label shown in header, fullscreen and capture summary. */
  teamName?: string;
  /** Optional temporal range label shown in capture summary. */
  rangeLabel?: string;
  /** Vertical alignment for the rendered pitch area. */
  pitchVerticalAlign?: "center" | "start";
}

const PassNetworkPitch: React.FC<PassNetworkPitchProps> = ({
  nodes,
  edges,
  color = "#ffffff",
  orientation,
  mirrorX = false,
  fieldColor,
  animated = false,
  noDataMessage,
  showHeader = true,
  teamName,
  rangeLabel,
  pitchVerticalAlign = "center",
}) => {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const canCapture = nodes.length > 0 && !noDataMessage;

  useEffect(() => {
    if (!isFullscreenOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreenOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isFullscreenOpen]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {showHeader ? (
        <>
          <PassNetworkPitchHeader
            teamName={teamName}
            connectionCount={edges.length}
            canCapture={canCapture}
            onCaptureClick={() => setIsCaptureOpen(true)}
            onFullscreenClick={() => setIsFullscreenOpen(true)}
          />
          <div className="pb-3">
            <Separator />
          </div>
        </>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <PassNetworkPitchBoard
          nodes={nodes}
          edges={edges}
          color={color}
          orientation={orientation}
          mirrorX={mirrorX}
          fieldColor={fieldColor}
          animated={animated}
          verticalAlign={pitchVerticalAlign}
        />
        {noDataMessage ? <PassNetworkNoDataOverlay message={noDataMessage} /> : null}
      </div>

      {isFullscreenOpen && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Red de pases en pantalla completa"
          onClick={() => setIsFullscreenOpen(false)}
        >
          <div
            className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold">
                  {teamName ? `Red de pases - ${teamName}` : "Red de pases"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {edges.length} conexiones visibles
                  {rangeLabel ? ` - ${rangeLabel}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreenOpen(false)}
              >
                <X className="size-4" />
                Salir
              </Button>
            </div>
            <div className="relative min-h-0 flex-1 bg-slate-100 p-4 dark:bg-slate-800">
              <PassNetworkPitchBoard
                nodes={nodes}
                edges={edges}
                color={color}
                orientation={orientation}
                mirrorX={mirrorX}
                fieldColor={fieldColor}
                animated={animated}
              />
              {noDataMessage ? <PassNetworkNoDataOverlay message={noDataMessage} /> : null}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      <PassNetworkCaptureModal
        open={isCaptureOpen}
        nodes={nodes}
        edges={edges}
        color={color}
        orientation={orientation}
        mirrorX={mirrorX}
        fieldColor={fieldColor}
        teamName={teamName}
        rangeLabel={rangeLabel}
        onClose={() => setIsCaptureOpen(false)}
      />
    </div>
  );
};

export default PassNetworkPitch;
