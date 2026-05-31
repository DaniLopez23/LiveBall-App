import type {
	DashboardWidgetType,
	WidgetDefinition,
} from "@/features/dashboard/types/dashboard.types";
import {
	DEFAULT_EVENT_MAP_CONFIG,
	DEFAULT_EVENT_MAP_FILTERS,
	EventMapWidget,
	EventMapWidgetConfig,
	EventMapWidgetFilters,
	type EventMapConfig,
	type EventMapFilters,
} from "@/features/dashboard/widgets/EventMapWidget";
import {
	DEFAULT_PASS_NETWORK_CONFIG,
	DEFAULT_PASS_NETWORK_WIDGET_FILTERS,
	PassNetworkWidget,
	PassNetworkWidgetConfig,
	PassNetworkWidgetFilters,
	type PassNetworkConfig,
	type PassNetworkWidgetFilters as PassNetworkWidgetFiltersState,
} from "@/features/dashboard/widgets/PassNetworkWidget";
import {
	DEFAULT_MATCH_STATS_CONFIG,
	DEFAULT_MATCH_STATS_FILTERS,
	MatchStatsWidget,
	MatchStatsWidgetConfig,
	MatchStatsWidgetFilters,
	type MatchStatsConfig,
	type MatchStatsFilters,
} from "@/features/dashboard/widgets/MatchStatsWidget";
import {
	DEFAULT_MOMENTUM_CONFIG,
	DEFAULT_STATS_EVOLUTION_CONFIG,
	DEFAULT_TIMELINE_CHART_FILTERS,
	MomentumChartWidget,
	MomentumChartWidgetConfig,
	MomentumChartWidgetFilters,
	StatsEvolutionChartWidget,
	StatsEvolutionChartWidgetConfig,
	StatsEvolutionChartWidgetFilters,
	type TimelineChartConfig,
	type TimelineChartFilters,
} from "@/features/dashboard/widgets/TimelineChartWidgets";

const eventMapDefinition = {
	type: "event-map",
	label: "Campograma de eventos",
	description: "Mapa de eventos filtrable por equipo, jugador, tipo y minuto.",
	defaultTitle: "Campograma de eventos",
	defaultConfig: DEFAULT_EVENT_MAP_CONFIG,
	defaultFilters: DEFAULT_EVENT_MAP_FILTERS,
	defaultLayout: { x: 0, y: 0, w: 6, h: 6, minW: 4, minH: 4 },
	component: EventMapWidget,
	configComponent: EventMapWidgetConfig,
	filterComponent: EventMapWidgetFilters,
} satisfies WidgetDefinition<EventMapConfig, EventMapFilters>;

const passNetworkDefinition = {
	type: "pass-network",
	label: "Red de pases",
	description: "Redes de pases por equipo con filtros del componente existente.",
	defaultTitle: "Red de pases",
	defaultConfig: DEFAULT_PASS_NETWORK_CONFIG,
	defaultFilters: DEFAULT_PASS_NETWORK_WIDGET_FILTERS,
	defaultLayout: { x: 6, y: 0, w: 6, h: 7, minW: 4, minH: 5 },
	component: PassNetworkWidget,
	configComponent: PassNetworkWidgetConfig,
	filterComponent: PassNetworkWidgetFilters,
} satisfies WidgetDefinition<PassNetworkConfig, PassNetworkWidgetFiltersState>;

const matchStatsDefinition = {
	type: "match-stats",
	label: "Estadisticas",
	description: "Comparativa y tarjetas de metricas generales del partido.",
	defaultTitle: "Estadisticas",
	defaultConfig: DEFAULT_MATCH_STATS_CONFIG,
	defaultFilters: DEFAULT_MATCH_STATS_FILTERS,
	defaultLayout: { x: 0, y: 7, w: 4, h: 5, minW: 3, minH: 3 },
	component: MatchStatsWidget,
	configComponent: MatchStatsWidgetConfig,
	filterComponent: MatchStatsWidgetFilters,
} satisfies WidgetDefinition<MatchStatsConfig, MatchStatsFilters>;

const statsEvolutionDefinition = {
	type: "stats-evolution-chart",
	label: "Grafica de evolucion",
	description: "Evolucion temporal de metricas con eventos clave opcionales.",
	defaultTitle: "Grafica de evolucion",
	defaultConfig: DEFAULT_STATS_EVOLUTION_CONFIG,
	defaultFilters: DEFAULT_TIMELINE_CHART_FILTERS,
	defaultLayout: { x: 4, y: 7, w: 4, h: 5, minW: 3, minH: 3 },
	component: StatsEvolutionChartWidget,
	configComponent: StatsEvolutionChartWidgetConfig,
	filterComponent: StatsEvolutionChartWidgetFilters,
} satisfies WidgetDefinition<TimelineChartConfig, TimelineChartFilters>;

const momentumDefinition = {
	type: "momentum-chart",
	label: "Grafica de momentum",
	description: "Momentum xT por ventana temporal y equipo.",
	defaultTitle: "Grafica de momentum",
	defaultConfig: DEFAULT_MOMENTUM_CONFIG,
	defaultFilters: DEFAULT_TIMELINE_CHART_FILTERS,
	defaultLayout: { x: 8, y: 7, w: 4, h: 5, minW: 3, minH: 3 },
	component: MomentumChartWidget,
	configComponent: MomentumChartWidgetConfig,
	filterComponent: MomentumChartWidgetFilters,
} satisfies WidgetDefinition<TimelineChartConfig, TimelineChartFilters>;

export const widgetDefinitions = [
	eventMapDefinition,
	passNetworkDefinition,
	matchStatsDefinition,
	statsEvolutionDefinition,
	momentumDefinition,
];

export const widgetRegistry = Object.fromEntries(
	widgetDefinitions.map((definition) => [definition.type, definition]),
) as unknown as Record<DashboardWidgetType, WidgetDefinition>;

export function getWidgetDefinition(type: DashboardWidgetType): WidgetDefinition {
	return widgetRegistry[type];
}
