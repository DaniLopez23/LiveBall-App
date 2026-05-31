import type { ComponentType } from "react";

export type DashboardMode = "view" | "edit";

export type DashboardBreakpoint = "lg" | "md" | "sm";

export type DashboardWidgetType =
	| "event-map"
	| "pass-network"
	| "match-stats"
	| "stats-evolution-chart"
	| "momentum-chart";

export interface DashboardLayoutItem {
	i: string;
	x: number;
	y: number;
	w: number;
	h: number;
	minW?: number;
	minH?: number;
	maxW?: number;
	maxH?: number;
	static?: boolean;
	isDraggable?: boolean;
	isResizable?: boolean;
	resizeHandles?: string[];
}

export type DashboardLayouts = Record<DashboardBreakpoint, DashboardLayoutItem[]>;

export interface DashboardWidget<
	TConfig extends Record<string, unknown> = Record<string, unknown>,
	TFilters extends Record<string, unknown> = Record<string, unknown>,
> {
	id: string;
	type: DashboardWidgetType;
	title: string;
	config: TConfig;
	filters: TFilters;
	minW?: number;
	minH?: number;
}

export interface DashboardTemplate {
	id: string;
	name: string;
	description?: string;
	layouts: DashboardLayouts;
	widgets: DashboardWidget[];
	createdAt: string;
	updatedAt: string;
}

export interface WidgetComponentProps<
	TConfig extends Record<string, unknown> = Record<string, unknown>,
	TFilters extends Record<string, unknown> = Record<string, unknown>,
> {
	widget: DashboardWidget<TConfig, TFilters>;
	config: TConfig;
	filters: TFilters;
	mode: DashboardMode;
}

export interface WidgetPanelProps<
	TValue extends Record<string, unknown> = Record<string, unknown>,
> {
	value: TValue;
	onChange: (value: TValue) => void;
}

export interface WidgetDefinition<
	TConfig extends Record<string, unknown> = Record<string, unknown>,
	TFilters extends Record<string, unknown> = Record<string, unknown>,
> {
	type: DashboardWidgetType;
	label: string;
	description: string;
	defaultTitle: string;
	defaultConfig: TConfig;
	defaultFilters: TFilters;
	defaultLayout: Omit<DashboardLayoutItem, "i">;
	component: ComponentType<WidgetComponentProps<TConfig, TFilters>>;
	configComponent: ComponentType<WidgetPanelProps<TConfig>>;
	filterComponent: ComponentType<WidgetPanelProps<TFilters>>;
}
