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
	verticalAlign?: "center" | "start";
}

const PassNetworkPitchBoard: React.FC<PassNetworkPitchBoardProps> = ({
	nodes,
	edges,
	color = "#ffffff",
	orientation,
	mirrorX = false,
	fieldColor,
	animated = false,
	verticalAlign = "center",
}) => (
	<OptaPitch
		orientation={orientation}
		fieldColor={fieldColor}
		verticalAlign={verticalAlign}
	>
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
