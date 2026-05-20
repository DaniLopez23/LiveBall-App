import { BarChart2 } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import type { PassNetworkFiltersState } from "./passNetworkFilters.types";
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

const resolvePlayerName = (
	playerId: string | undefined,
	nodes: PassNetworkNode[],
): string => {
	if (!playerId) return "-";
	const node = nodes.find((item) => item.player_id === playerId);
	return node?.player_name || playerId;
};

const playerMetricValue = (
	playerId: string | undefined,
	nodes: PassNetworkNode[],
	count: number | undefined,
): MetricValue => {
	if (!playerId) return EMPTY_VALUE;

	return {
		main: resolvePlayerName(playerId, nodes),
		count: count === undefined ? undefined : String(count),
	};
};

const connectionMetricValue = (
	connection: PassNetworkStatisticsBucket["top_connection"] | undefined,
	nodes: PassNetworkNode[],
): MetricValue => {
	if (!connection) return EMPTY_VALUE;

	return {
		main: resolvePlayerName(connection.from_player_id, nodes),
		count: String(connection.pass_count),
		detail: `→ ${resolvePlayerName(connection.to_player_id, nodes)}`,
	};
};

const totalPassesMetricValue = (
	bucket: PassNetworkStatisticsBucket | null,
): MetricValue => ({
	main: bucket ? String(bucket.total_passes) : "-",
	detail: bucket ? "pases" : undefined,
});

const MetricValueCell: React.FC<{
	value: MetricValue;
	color: string;
	align: "left" | "right";
}> = ({ value, color, align }) => {
	const isRight = align === "right";

	return (
		<div
			className={[
				"min-w-0",
				isRight ? "text-right" : "text-left",
			].join(" ")}
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
					homeValue={totalPassesMetricValue(homeBucket)}
					awayValue={totalPassesMetricValue(awayBucket)}
					homeColor={homeColor}
					awayColor={awayColor}
				/>
				<Separator />
				<MetricRow
					label="Top pasador"
					homeValue={playerMetricValue(
						homeBucket?.top_passer?.player_id,
						homeNodes,
						homeBucket?.top_passer?.passes_given,
					)}
					awayValue={playerMetricValue(
						awayBucket?.top_passer?.player_id,
						awayNodes,
						awayBucket?.top_passer?.passes_given,
					)}
					homeColor={homeColor}
					awayColor={awayColor}
				/>
				<Separator />
				<MetricRow
					label="Top receptor"
					homeValue={playerMetricValue(
						homeBucket?.top_receiver?.player_id,
						homeNodes,
						homeBucket?.top_receiver?.passes_received,
					)}
					awayValue={playerMetricValue(
						awayBucket?.top_receiver?.player_id,
						awayNodes,
						awayBucket?.top_receiver?.passes_received,
					)}
					homeColor={homeColor}
					awayColor={awayColor}
				/>
				<Separator />
				<MetricRow
					label="Top jugador total"
					homeValue={playerMetricValue(
						homeBucket?.top_player_total?.player_id,
						homeNodes,
						homeBucket?.top_player_total?.total_passes,
					)}
					awayValue={playerMetricValue(
						awayBucket?.top_player_total?.player_id,
						awayNodes,
						awayBucket?.top_player_total?.total_passes,
					)}
					homeColor={homeColor}
					awayColor={awayColor}
				/>
				<Separator />
				<MetricRow
					label="Top conexion"
					homeValue={connectionMetricValue(homeBucket?.top_connection, homeNodes)}
					awayValue={connectionMetricValue(awayBucket?.top_connection, awayNodes)}
					homeColor={homeColor}
					awayColor={awayColor}
				/>
			</div>
		</div>
	);
};

export default PassNetworkStats;
