import type {
	DashboardBreakpoint,
	DashboardLayoutItem,
	DashboardLayouts,
	DashboardTemplate,
	DashboardWidget,
} from "@/features/dashboard/types/dashboard.types";

export const DASHBOARD_BREAKPOINTS: Record<DashboardBreakpoint, number> = {
	lg: 1200,
	md: 768,
	sm: 0,
};

export const DASHBOARD_COLS: Record<DashboardBreakpoint, number> = {
	lg: 12,
	md: 8,
	sm: 4,
};

export const DASHBOARD_ROW_HEIGHT = 72;

export const DASHBOARD_MARGIN: [number, number] = [12, 12];

export const DASHBOARD_BREAKPOINT_ORDER: DashboardBreakpoint[] = ["lg", "md", "sm"];

export function emptyDashboardLayouts(): DashboardLayouts {
	return {
		lg: [],
		md: [],
		sm: [],
	};
}

export function getLayoutItem(
	layouts: DashboardLayouts,
	breakpoint: DashboardBreakpoint,
	widgetId: string,
): DashboardLayoutItem | undefined {
	return layouts[breakpoint].find((item) => item.i === widgetId);
}

export function buildResponsiveLayoutItem(
	widgetId: string,
	defaultLayout: Omit<DashboardLayoutItem, "i">,
	breakpoint: DashboardBreakpoint,
	existingItems: DashboardLayoutItem[],
): DashboardLayoutItem {
	const cols = DASHBOARD_COLS[breakpoint];
	const width = breakpoint === "sm" ? cols : Math.min(defaultLayout.w, cols);
	const x = breakpoint === "sm" ? 0 : Math.min(defaultLayout.x, Math.max(0, cols - width));
	const y =
		existingItems.length === 0
			? defaultLayout.y
			: Math.max(...existingItems.map((item) => item.y + item.h)) + 1;

	return {
		...defaultLayout,
		i: widgetId,
		x,
		y,
		w: width,
	};
}

export function addWidgetToLayouts(
	layouts: DashboardLayouts,
	widgetId: string,
	defaultLayout: Omit<DashboardLayoutItem, "i">,
): DashboardLayouts {
	return DASHBOARD_BREAKPOINT_ORDER.reduce<DashboardLayouts>(
		(nextLayouts, breakpoint) => {
			nextLayouts[breakpoint] = [
				...layouts[breakpoint],
				buildResponsiveLayoutItem(
					widgetId,
					defaultLayout,
					breakpoint,
					layouts[breakpoint],
				),
			];
			return nextLayouts;
		},
		emptyDashboardLayouts(),
	);
}

export function removeWidgetFromLayouts(
	layouts: DashboardLayouts,
	widgetId: string,
): DashboardLayouts {
	return DASHBOARD_BREAKPOINT_ORDER.reduce<DashboardLayouts>(
		(nextLayouts, breakpoint) => {
			nextLayouts[breakpoint] = layouts[breakpoint].filter((item) => item.i !== widgetId);
			return nextLayouts;
		},
		emptyDashboardLayouts(),
	);
}

export function normalizeTemplateLayouts(template: DashboardTemplate): DashboardLayouts {
	return DASHBOARD_BREAKPOINT_ORDER.reduce<DashboardLayouts>(
		(nextLayouts, breakpoint) => {
			const sourceItems = template.layouts[breakpoint] ?? [];
			const byId = new Map(sourceItems.map((item) => [item.i, item]));
			let items: DashboardLayoutItem[] = [];

			for (const widget of template.widgets) {
				const existing = byId.get(widget.id);
				if (existing) {
					items = [
						...items,
						{
							...existing,
							minW: widget.minW ?? existing.minW,
							minH: widget.minH ?? existing.minH,
						},
					];
					continue;
				}

				items = [
					...items,
					buildResponsiveLayoutItem(
						widget.id,
						{
							x: 0,
							y: 0,
							w: breakpoint === "sm" ? DASHBOARD_COLS.sm : 4,
							h: 5,
							minW: widget.minW ?? 3,
							minH: widget.minH ?? 3,
						},
						breakpoint,
						items,
					),
				];
			}

			nextLayouts[breakpoint] = items;
			return nextLayouts;
		},
		emptyDashboardLayouts(),
	);
}

export function getWidgetLayout(
	template: DashboardTemplate,
	widget: DashboardWidget,
): DashboardLayoutItem | undefined {
	return DASHBOARD_BREAKPOINT_ORDER.map((breakpoint) =>
		getLayoutItem(template.layouts, breakpoint, widget.id),
	).find(Boolean);
}
