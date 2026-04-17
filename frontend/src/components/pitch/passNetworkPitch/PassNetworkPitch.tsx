import React from "react";
import OptaPitch from "@/components/pitch/OptaPitch";
import PassNetworkElements from "./PassNetworkElements";
import PassNetworkNoDataOverlay from "./PassNetworkNoDataOverlay";
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
}) => {
  return (
    <div className="relative w-full h-full">
      <OptaPitch orientation={orientation} fieldColor={fieldColor}>
        <PassNetworkElements
          nodes={nodes}
          edges={edges}
          color={color}
          animated={animated}
          orientation={orientation}
          mirrorX={mirrorX}
        />
      </OptaPitch>
      {noDataMessage ? <PassNetworkNoDataOverlay message={noDataMessage} /> : null}
    </div>
  );
};

export default PassNetworkPitch;