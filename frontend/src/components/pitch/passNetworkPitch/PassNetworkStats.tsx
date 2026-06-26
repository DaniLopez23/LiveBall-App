import { BarChart2 } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import type { PassNetworkEdge, PassNetworkNode } from "@/types/passNetwork";

interface DisplayNetwork {
	nodes: PassNetworkNode[];
	edges: PassNetworkEdge[];
}

interface PassNetworkStatsProps {
	homeNetwork: DisplayNetwork | null;
	awayNetwork: DisplayNetwork | null;
	homeTeamName: string;
	awayTeamName: string;
	homeColor: string;
	awayColor: string;
}

interface MetricValue {
	main: string;
	count?: string;
	detail?: string;
}

interface MetricRowProps {
	label: string;
	homeValue: MetricValue;
	awayValue: MetricValue;
	homeColor: string;
	awayColor: string;
}

const EMPTY_VALUE: MetricValue = { main: "-" };

const resolvePlayerName = (
	playerId: string | undefined,
	nodes: PassNetworkNode[],
): string => {
	if (!playerId) return "-";
	const node = nodes.find((item) => item.player_id === playerId);
	return node?.player_name || playerId;
};

const playerMetricValue = (
	player: PassNetworkNode | null,
	count: number | undefined,
): MetricValue => {
	if (!player) return EMPTY_VALUE;

	return {
		main: player.player_name || player.player_id,
		count: count === undefined ? undefined : String(count),
	};
};

const connectionMetricValue = (
	connection: PassNetworkEdge | null,
	nodes: PassNetworkNode[],
): MetricValue => {
	if (!connection) return EMPTY_VALUE;

	return {
		main: resolvePlayerName(connection.from_player_id, nodes),
		count: String(connection.pass_count),
		detail: `-> ${resolvePlayerName(connection.to_player_id, nodes)}`,
	};
};

const totalPassesMetricValue = (totalPasses: number): MetricValue => ({
	main: String(totalPasses),
	detail: "pases",
});

const getTopNode = (
	nodes: PassNetworkNode[],
	score: (node: PassNetworkNode) => number,
): PassNetworkNode | null => {
	let topNode: PassNetworkNode | null = null;
	let topScore = 0;

	for (const node of nodes) {
		const value = score(node);
		if (value > topScore) {
			topNode = node;
			topScore = value;
		}
	}

	return topNode;
};

const getTopConnection = (edges: PassNetworkEdge[]): PassNetworkEdge | null => {
	let topEdge: PassNetworkEdge | null = null;
	let topScore = 0;

	for (const edge of edges) {
		if (edge.pass_count > topScore) {
			topEdge = edge;
			topScore = edge.pass_count;
		}
	}

	return topEdge;
};

const MetricValueCell: React.FC<{
	value: MetricValue;
	color: string;
	align: "left" | "right";
}> = ({ value, color, align }) => {
	const isRight = align === "right";

	return (
		<div
			className={["min-w-0", isRight ? "text-right" : "text-left"].join(" ")}
			title={[value.main, value.detail].filter(Boolean).join(" ")}
		>
			<div
				className={[
					"flex min-w-0 items-start gap-1.5",
					isRight ? "flex-row-reverse" : "",
				].join(" ")}
			>
				<p className="min-w-0 flex-1 break-words text-sm font-medium leading-snug text-foreground">
					{value.main}
				</p>
				{value.count ? (
					<span
						className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-none text-white"
						style={{ backgroundColor: color }}
					>
						{value.count}
					</span>
				) : null}
			</div>
			{value.detail ? (
				<p className="mt-0.5 break-words text-xs leading-snug text-muted-foreground">
					{value.detail}
				</p>
			) : null}
		</div>
	);
};

const MetricRow: React.FC<MetricRowProps> = ({
	label,
	homeValue,
	awayValue,
	homeColor,
	awayColor,
}) => {
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_4.75rem_minmax(0,1fr)] items-start gap-2 py-2.5">
			<MetricValueCell value={homeValue} color={homeColor} align="left" />
			<p className="pt-0.5 text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-sky-600 dark:text-sky-400">
				{label}
			</p>
			<MetricValueCell value={awayValue} color={awayColor} align="right" />
		</div>
	);
};

const PassNetworkStats: React.FC<PassNetworkStatsProps> = ({
	homeNetwork,
	awayNetwork,
	homeTeamName,
	awayTeamName,
	homeColor,
	awayColor,
}) => {
	const homeNodes = homeNetwork?.nodes ?? [];
	const awayNodes = awayNetwork?.nodes ?? [];
	const homeEdges = homeNetwork?.edges ?? [];
	const awayEdges = awayNetwork?.edges ?? [];

	if (homeEdges.length === 0 && awayEdges.length === 0) {
		return (
			<div className="flex h-full items-center justify-center p-4">
				<div className="text-center text-muted-foreground">
					<BarChart2 className="mx-auto mb-2 size-8 opacity-40" />
					<p className="text-sm font-medium">Estadisticas de red de pases</p>
					<p className="mt-1 text-xs">Esperando datos para el rango seleccionado.</p>
				</div>
			</div>
		);
	}

	const homeTopPasser = getTopNode(homeNodes, (node) => node.passes_given);
	const awayTopPasser = getTopNode(awayNodes, (node) => node.passes_given);
	const homeTopReceiver = getTopNode(homeNodes, (node) => node.passes_received);
	const awayTopReceiver = getTopNode(awayNodes, (node) => node.passes_received);
	const homeTopTotal = getTopNode(
		homeNodes,
		(node) => node.passes_given + node.passes_received,
	);
	const awayTopTotal = getTopNode(
		awayNodes,
		(node) => node.passes_given + node.passes_received,
	);

	return (
		<div className="flex h-full min-h-0 flex-col gap-2">
			<div className="grid grid-cols-[minmax(0,1fr)_4.75rem_minmax(0,1fr)] items-center gap-2 py-1">
				<p className="break-words text-left text-xs font-semibold leading-tight" style={{ color: homeColor }}>
					{homeTeamName}
				</p>
				<p className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400">
					Metrica
				</p>
				<p className="break-words text-right text-xs font-semibold leading-tight" style={{ color: awayColor }}>
					{awayTeamName}
				</p>
			</div>

			<Separator />

			<div className="min-h-0 overflow-auto pr-1">
				<MetricRow
					label="Total pases"
					homeValue={totalPassesMetricValue(
						homeEdges.reduce((total, edge) => total + edge.pass_count, 0),
					)}
					awayValue={totalPassesMetricValue(
						awayEdges.reduce((total, edge) => total + edge.pass_count, 0),
					)}
					homeColor={homeColor}
					awayColor={awayColor}
				/>
				<Separator />
				<MetricRow
					label="Top pasador"
					homeValue={playerMetricValue(homeTopPasser, homeTopPasser?.passes_given)}
					awayValue={playerMetricValue(awayTopPasser, awayTopPasser?.passes_given)}
					homeColor={homeColor}
					awayColor={awayColor}
				/>
				<Separator />
				<MetricRow
					label="Top receptor"
					homeValue={playerMetricValue(homeTopReceiver, homeTopReceiver?.passes_received)}
					awayValue={playerMetricValue(awayTopReceiver, awayTopReceiver?.passes_received)}
					homeColor={homeColor}
					awayColor={awayColor}
				/>
				<Separator />
				<MetricRow
					label="Top jugador total"
					homeValue={playerMetricValue(
						homeTopTotal,
						homeTopTotal
							? homeTopTotal.passes_given + homeTopTotal.passes_received
							: undefined,
					)}
					awayValue={playerMetricValue(
						awayTopTotal,
						awayTopTotal
							? awayTopTotal.passes_given + awayTopTotal.passes_received
							: undefined,
					)}
					homeColor={homeColor}
					awayColor={awayColor}
				/>
				<Separator />
				<MetricRow
					label="Top conexion"
					homeValue={connectionMetricValue(getTopConnection(homeEdges), homeNodes)}
					awayValue={connectionMetricValue(getTopConnection(awayEdges), awayNodes)}
					homeColor={homeColor}
					awayColor={awayColor}
				/>
			</div>
		</div>
	);
};

export default PassNetworkStats;
