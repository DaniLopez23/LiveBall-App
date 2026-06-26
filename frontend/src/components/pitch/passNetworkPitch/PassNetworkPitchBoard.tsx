import OptaPitch from "@/components/pitch/OptaPitch";
import type { Orientation } from "@/store/optaPitchConfigStore";
import type { PassNetworkEdge, PassNetworkNode } from "@/types/passNetwork";
import PassNetworkElements from "./PassNetworkElements";

interface PassNetworkPitchBoardProps {
	nodes: PassNetworkNode[];
	edges: PassNetworkEdge[];
	color?: string;
	orientation?: Orientation;
	mirrorX?: boolean;
	fieldColor?: string;
	animated?: boolean;
}

const PassNetworkPitchBoard: React.FC<PassNetworkPitchBoardProps> = ({
	nodes,
	edges,
	color = "#ffffff",
	orientation,
	mirrorX = false,
	fieldColor,
	animated = false,
}) => (
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
);

export default PassNetworkPitchBoard;
