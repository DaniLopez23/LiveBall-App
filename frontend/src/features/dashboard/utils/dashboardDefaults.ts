import type {
	DashboardTemplate,
	DashboardWidget,
	DashboardWidgetType,
} from "@/features/dashboard/types/dashboard.types";
import { addWidgetToLayouts, emptyDashboardLayouts } from "@/features/dashboard/utils/dashboardLayout";
import {
	getWidgetDefinition,
	widgetDefinitions,
} from "@/features/dashboard/widgets/widgetRegistry";

function cloneValue<T>(value: T): T {
	if (typeof structuredClone === "function") {
		return structuredClone(value);
	}

	return JSON.parse(JSON.stringify(value)) as T;
}

export function createDashboardId(prefix: string) {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return `${prefix}-${crypto.randomUUID()}`;
	}

	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso() {
	return new Date().toISOString();
}

export function createDashboardWidget(
	type: DashboardWidgetType,
	overrides: Partial<DashboardWidget> = {},
): DashboardWidget {
	const definition = getWidgetDefinition(type);

	return {
		id: overrides.id ?? createDashboardId("widget"),
		type,
		title: overrides.title ?? definition.defaultTitle,
		config: cloneValue(overrides.config ?? definition.defaultConfig),
		filters: cloneValue(overrides.filters ?? definition.defaultFilters),
		minW: overrides.minW ?? definition.defaultLayout.minW,
		minH: overrides.minH ?? definition.defaultLayout.minH,
	};
}

export function createDashboardTemplate(
	name = "Resumen del partido",
	description = "Plantilla base con widgets de analisis en directo.",
): DashboardTemplate {
	const createdAt = nowIso();
	let layouts = emptyDashboardLayouts();
	const widgets = widgetDefinitions.map((definition) => {
		const widget = createDashboardWidget(definition.type);
		layouts = addWidgetToLayouts(layouts, widget.id, definition.defaultLayout);
		return widget;
	});

	return {
		id: createDashboardId("template"),
		name,
		description,
		layouts,
		widgets,
		createdAt,
		updatedAt: createdAt,
	};
}

export function duplicateDashboardTemplate(template: DashboardTemplate): DashboardTemplate {
	const createdAt = nowIso();
	const widgetIdMap = new Map<string, string>();
	const widgets = template.widgets.map((widget) => {
		const nextId = createDashboardId("widget");
		widgetIdMap.set(widget.id, nextId);

		return {
			...cloneValue(widget),
			id: nextId,
		};
	});
	const layouts = {
		lg: template.layouts.lg.map((item) => ({
			...item,
			i: widgetIdMap.get(item.i) ?? item.i,
		})),
		md: template.layouts.md.map((item) => ({
			...item,
			i: widgetIdMap.get(item.i) ?? item.i,
		})),
		sm: template.layouts.sm.map((item) => ({
			...item,
			i: widgetIdMap.get(item.i) ?? item.i,
		})),
	};

	return {
		...cloneValue(template),
		id: createDashboardId("template"),
		name: `${template.name} copia`,
		layouts,
		widgets,
		createdAt,
		updatedAt: createdAt,
	};
}

export function createInitialDashboardTemplates() {
	return [createDashboardTemplate()];
}
