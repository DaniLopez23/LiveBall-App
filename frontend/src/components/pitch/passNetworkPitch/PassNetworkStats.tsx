import { BarChart2 } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import type { PassNetworkFiltersState } from "./PassNetworkFilters";
import type {
	PassNetworkNode,
	PassNetworkStatisticsBucket,
	TeamPassNetwork,
} from "@/types/passNetwork";

interface PassNetworkStatsProps {
	filters: PassNetworkFiltersState;
	homeNetwork: TeamPassNetwork | null;
	awayNetwork: TeamPassNetwork | null;
	homeTeamName: string;
	awayTeamName: string;
	homeColor: string;
	awayColor: string;
}

const pickBucketFromFilters = (
	buckets: PassNetworkStatisticsBucket[] | undefined,
	minuteRange: [number, number],
): PassNetworkStatisticsBucket | null => {
	if (!buckets || buckets.length === 0) return null;

	const targetBucket = Math.min(18, Math.max(0, Math.floor(minuteRange[1] / 5)));
	const exactMatch = buckets.find((bucket) => bucket.bucket_index === targetBucket);
	if (exactMatch) return exactMatch;

	const targetMinute = minuteRange[1];
	const closestPrevious = buckets
		.filter((bucket) => bucket.minute <= targetMinute)
		.sort((a, b) => b.minute - a.minute)[0];

	return closestPrevious ?? buckets[0] ?? null;
};

const findTopCentrality = (
	centrality: Record<string, number> | undefined,
): { playerId: string; value: number } | null => {
	if (!centrality) return null;
	const entries = Object.entries(centrality);
	if (entries.length === 0) return null;

	const sorted = [...entries].sort((a, b) => b[1] - a[1]);
	const [playerId, value] = sorted[0];
	if (playerId === undefined || value === undefined) return null;
 
	return { playerId, value };
};

const formatCentrality = (value: number | undefined): string => {
	if (value === undefined) return "-";
	return value.toFixed(4);
};

const resolvePlayerName = (
	playerId: string | undefined,
	nodes: PassNetworkNode[],
): string => {
	if (!playerId) return "-";
	const node = nodes.find((item) => item.player_id === playerId);
	return node?.player_name || playerId;
};

interface MetricRowProps {
	label: string;
	homeValue: string;
	awayValue: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, homeValue, awayValue }) => {
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-2">
			<p className="truncate justify-self-start text-left text-sm font-medium text-foreground">{homeValue}</p>
			<p className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-600 dark:text-sky-400">
				{label}
			</p>
			<p className="truncate justify-self-end text-right text-sm font-medium text-foreground">{awayValue}</p>
		</div>
	);
};

const PassNetworkStats: React.FC<PassNetworkStatsProps> = ({
	filters,
	homeNetwork,
	awayNetwork,
	homeTeamName,
	awayTeamName,
	homeColor,
	awayColor,
}) => {
	const homeBucket = pickBucketFromFilters(homeNetwork?.statistics?.buckets, filters.minuteRange);
	const awayBucket = pickBucketFromFilters(awayNetwork?.statistics?.buckets, filters.minuteRange);

	if (!homeNetwork?.statistics?.buckets?.length && !awayNetwork?.statistics?.buckets?.length) {
		return (
			<div className="flex h-full items-center justify-center p-4">
				<div className="text-center text-muted-foreground">
					<BarChart2 className="mx-auto mb-2 size-8 opacity-40" />
					<p className="text-sm font-medium">Estadisticas de red de pases</p>
					<p className="mt-1 text-xs">Esperando datos de estadisticas por bucket.</p>
				</div>
			</div>
		);
	}

	const homeNodes = homeNetwork?.nodes ?? [];
	const awayNodes = awayNetwork?.nodes ?? [];

	const homeTopPasser = `${resolvePlayerName(homeBucket?.top_passer?.player_id, homeNodes)}${homeBucket?.top_passer?.passes_given !== undefined ? ` (${homeBucket.top_passer.passes_given})` : ""}`;
	const awayTopPasser = `${resolvePlayerName(awayBucket?.top_passer?.player_id, awayNodes)}${awayBucket?.top_passer?.passes_given !== undefined ? ` (${awayBucket.top_passer.passes_given})` : ""}`;

	const homeTopReceiver = `${resolvePlayerName(homeBucket?.top_receiver?.player_id, homeNodes)}${homeBucket?.top_receiver?.passes_received !== undefined ? ` (${homeBucket.top_receiver.passes_received})` : ""}`;
	const awayTopReceiver = `${resolvePlayerName(awayBucket?.top_receiver?.player_id, awayNodes)}${awayBucket?.top_receiver?.passes_received !== undefined ? ` (${awayBucket.top_receiver.passes_received})` : ""}`;

	const homeTopTotal = `${resolvePlayerName(homeBucket?.top_player_total?.player_id, homeNodes)}${homeBucket?.top_player_total?.total_passes !== undefined ? ` (${homeBucket.top_player_total.total_passes})` : ""}`;
	const awayTopTotal = `${resolvePlayerName(awayBucket?.top_player_total?.player_id, awayNodes)}${awayBucket?.top_player_total?.total_passes !== undefined ? ` (${awayBucket.top_player_total.total_passes})` : ""}`;

	const homeTopConnection = homeBucket?.top_connection
		? `${resolvePlayerName(homeBucket.top_connection.from_player_id, homeNodes)} -> ${resolvePlayerName(homeBucket.top_connection.to_player_id, homeNodes)} (${homeBucket.top_connection.pass_count})`
		: "-";
	const awayTopConnection = awayBucket?.top_connection
		? `${resolvePlayerName(awayBucket.top_connection.from_player_id, awayNodes)} -> ${resolvePlayerName(awayBucket.top_connection.to_player_id, awayNodes)} (${awayBucket.top_connection.pass_count})`
		: "-";

	const homeBetweennessTop = findTopCentrality(homeBucket?.betweenness_centrality);
	const awayBetweennessTop = findTopCentrality(awayBucket?.betweenness_centrality);
	const homeEigenvectorTop = findTopCentrality(homeBucket?.eigenvector_centrality);
	const awayEigenvectorTop = findTopCentrality(awayBucket?.eigenvector_centrality);
	const homeFlowTop = findTopCentrality(homeBucket?.flow_centrality);
	const awayFlowTop = findTopCentrality(awayBucket?.flow_centrality);

	const homeBetweenness = homeBetweennessTop
		? `${resolvePlayerName(homeBetweennessTop.playerId, homeNodes)} (${formatCentrality(homeBetweennessTop.value)})`
		: "-";
	const awayBetweenness = awayBetweennessTop
		? `${resolvePlayerName(awayBetweennessTop.playerId, awayNodes)} (${formatCentrality(awayBetweennessTop.value)})`
		: "-";

	const homeEigenvector = homeEigenvectorTop
		? `${resolvePlayerName(homeEigenvectorTop.playerId, homeNodes)} (${formatCentrality(homeEigenvectorTop.value)})`
		: "-";
	const awayEigenvector = awayEigenvectorTop
		? `${resolvePlayerName(awayEigenvectorTop.playerId, awayNodes)} (${formatCentrality(awayEigenvectorTop.value)})`
		: "-";

	const homeFlow = homeFlowTop
		? `${resolvePlayerName(homeFlowTop.playerId, homeNodes)} (${formatCentrality(homeFlowTop.value)})`
		: "-";
	const awayFlow = awayFlowTop
		? `${resolvePlayerName(awayFlowTop.playerId, awayNodes)} (${formatCentrality(awayFlowTop.value)})`
		: "-";

	return (
		<div className="flex h-full flex-col gap-2">
			<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-1">
				<p className="truncate text-left text-xs font-semibold" style={{ color: homeColor }}>
					{homeTeamName}
				</p>
				<p className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400">
					Metrica
				</p>
				<p className="truncate text-right text-xs font-semibold" style={{ color: awayColor }}>
					{awayTeamName}
				</p>
			</div>

			<Separator />

			<div className="grid overflow-auto pr-1">
				<MetricRow
					label="Total pases"
					homeValue={homeBucket ? String(homeBucket.total_passes) : "-"}
					awayValue={awayBucket ? String(awayBucket.total_passes) : "-"}
				/>
				<Separator />
				<MetricRow label="Top pasador" homeValue={homeTopPasser} awayValue={awayTopPasser} />
				<Separator />
				<MetricRow label="Top receptor" homeValue={homeTopReceiver} awayValue={awayTopReceiver} />
				<Separator />
				<MetricRow label="Top jugador total" homeValue={homeTopTotal} awayValue={awayTopTotal} />
				<Separator />
				<MetricRow
					label="Top conexion"
					homeValue={homeTopConnection}
					awayValue={awayTopConnection}
				/>
				<Separator />
				<MetricRow
					label="Top betweenness"
					homeValue={homeBetweenness}
					awayValue={awayBetweenness}
				/>
				<Separator />
				<MetricRow
					label="Top eigenvector"
					homeValue={homeEigenvector}
					awayValue={awayEigenvector}
				/>
				<Separator />
				<MetricRow label="Top flow" homeValue={homeFlow} awayValue={awayFlow} />
			</div>
		</div>
	);
};

export default PassNetworkStats;
