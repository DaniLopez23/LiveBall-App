import { useId, useState, type ComponentType } from "react";
import { ChevronDown } from "lucide-react";
import type { StatGroupName, TeamGroupedStats } from "@/types/stats";

export interface StatMetricConfig {
	key: string;
	label: string;
	format?: (value: number | null) => string;
}

interface StatsComparisonBarsProps {
	group: StatGroupName;
	title: string;
	icon: ComponentType<{ className?: string }>;
	home: TeamGroupedStats;
	away: TeamGroupedStats;
	metrics: StatMetricConfig[];
}

const numberFormatter = new Intl.NumberFormat("es-ES", {
	maximumFractionDigits: 1,
});

export const formatStatValue = (value: number | null): string => {
	if (value == null) return "-";
	return numberFormatter.format(value);
};

export const formatPercentValue = (value: number | null): string => {
	if (value == null) return "-";
	return `${numberFormatter.format(value)}%`;
};

function getTotal(team: TeamGroupedStats, group: StatGroupName, metricKey: string) {
	return team.groups[group]?.[metricKey]?.total ?? null;
}

function getBarWidth(value: number | null, totalValue: number): string {
	if (value == null || value <= 0 || totalValue <= 0) return "0%";
	return `${Math.max(4, Math.min(100, (value / totalValue) * 100))}%`;
}

export default function StatsComparisonBars({
	group,
	title,
	icon: Icon,
	home,
	away,
	metrics,
}: StatsComparisonBarsProps) {
	const panelId = useId();
	const [isOpen, setIsOpen] = useState(true);

	return (
		<section className="rounded-md border bg-background shadow-sm">
			<header className="border-b">
				<button
					type="button"
					aria-expanded={isOpen}
					aria-controls={panelId}
					title={isOpen ? `Ocultar ${title}` : `Mostrar ${title}`}
					onClick={() => setIsOpen((current) => !current)}
					className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<span className="flex min-w-0 items-center gap-2">
						<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
							<Icon className="size-4" />
						</span>
						<span className="truncate text-sm font-semibold text-foreground">
							{title}
						</span>
					</span>
					<span className="flex shrink-0 items-center gap-2">
						<span className="text-xs text-muted-foreground">
							{metrics.length} metricas
						</span>
						<ChevronDown
							className={[
								"size-4 text-muted-foreground transition-transform",
								isOpen ? "rotate-180" : "",
							].join(" ")}
						/>
					</span>
				</button>
			</header>

			<div id={panelId} hidden={!isOpen} className="divide-y">
				<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2 text-[11px] font-medium text-muted-foreground">
					<span className="truncate text-right">{home.teamName}</span>
					<span className="h-px w-10 bg-border" />
					<span className="truncate">{away.teamName}</span>
				</div>

				{metrics.map((metric) => {
					const homeValue = getTotal(home, group, metric.key);
					const awayValue = getTotal(away, group, metric.key);
					const totalValue = Math.max((homeValue ?? 0) + (awayValue ?? 0), 0);
					const formatter = metric.format ?? formatStatValue;

					return (
						<div
							key={metric.key}
							className="grid grid-cols-[minmax(3.5rem,0.7fr)_minmax(8rem,1fr)_minmax(3.5rem,0.7fr)] items-center gap-3 px-4 py-3"
						>
							<div className="text-right text-xs font-semibold tabular-nums text-foreground">
								{formatter(homeValue)}
							</div>

							<div>
								<div className="mb-1.5 text-center text-[11px] font-medium text-muted-foreground">
									{metric.label}
								</div>
								<div
									className="grid h-3 grid-cols-2 gap-px rounded-full bg-muted"
									aria-label={`${metric.label}: ${home.teamName} ${formatter(
										homeValue,
									)}, ${away.teamName} ${formatter(awayValue)}`}
								>
									<div className="relative h-full rounded-l-full bg-blue-100/80">
										<div
											className="group absolute right-0 top-0 h-full cursor-default rounded-l-full bg-blue-500 transition-opacity hover:opacity-85"
											style={{ width: getBarWidth(homeValue, totalValue) }}
										>
											<span className="pointer-events-none absolute bottom-full right-0 z-10 mb-1 hidden whitespace-nowrap rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-foreground shadow-md group-hover:block">
												{home.teamName}: {formatter(homeValue)}
											</span>
										</div>
									</div>
									<div className="relative h-full rounded-r-full bg-rose-100/80">
										<div
											className="group absolute left-0 top-0 h-full cursor-default rounded-r-full bg-rose-500 transition-opacity hover:opacity-85"
											style={{ width: getBarWidth(awayValue, totalValue) }}
										>
											<span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden whitespace-nowrap rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-foreground shadow-md group-hover:block">
												{away.teamName}: {formatter(awayValue)}
											</span>
										</div>
									</div>
								</div>
							</div>

							<div className="text-xs font-semibold tabular-nums text-foreground">
								{formatter(awayValue)}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}
