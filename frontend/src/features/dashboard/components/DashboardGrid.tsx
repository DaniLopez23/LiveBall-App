import { getCompactor, Responsive, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { Button } from "@/components/ui/button";
import type {
	DashboardLayoutItem,
	DashboardLayouts,
	DashboardMode,
	DashboardTemplate,
} from "@/features/dashboard/types/dashboard.types";
import { DashboardWidgetFrame } from "@/features/dashboard/components/DashboardWidgetFrame";
import {
	DASHBOARD_BREAKPOINTS,
	DASHBOARD_COLS,
	DASHBOARD_MARGIN,
	DASHBOARD_ROW_HEIGHT,
	emptyDashboardLayouts,
	normalizeTemplateLayouts,
} from "@/features/dashboard/utils/dashboardLayout";

const ResponsiveGridLayout = Responsive;
const dashboardCompactor = getCompactor("vertical");
const editResizeHandles = ["s", "e", "se"];

interface DashboardGridProps {
	template: DashboardTemplate | null;
	mode: DashboardMode;
	selectedWidgetId: string | null;
	onSelectWidget: (widgetId: string | null) => void;
	onLayoutsChange: (layouts: DashboardLayouts) => void;
	onOpenAddWidget: () => void;
}

function coerceLayouts(layouts: Partial<Record<string, unknown>>): DashboardLayouts {
	const nextLayouts = emptyDashboardLayouts();

	for (const breakpoint of Object.keys(nextLayouts) as Array<keyof DashboardLayouts>) {
		const items = layouts[breakpoint];
		nextLayouts[breakpoint] = Array.isArray(items)
			? items.map((item) => ({ ...(item as DashboardLayouts[typeof breakpoint][number]) }))
			: [];
	}

	return nextLayouts;
}

function getInteractiveLayouts(
	layouts: DashboardLayouts,
	mode: DashboardMode,
): DashboardLayouts {
	const editable = mode === "edit";
	const prepareItem = (item: DashboardLayoutItem): DashboardLayoutItem => ({
		...item,
		static: false,
		isDraggable: editable,
		isResizable: editable,
		resizeHandles: editResizeHandles,
	});

	return {
		lg: layouts.lg.map(prepareItem),
		md: layouts.md.map(prepareItem),
		sm: layouts.sm.map(prepareItem),
	};
}

export function DashboardGrid({
	template,
	mode,
	selectedWidgetId,
	onSelectWidget,
	onLayoutsChange,
	onOpenAddWidget,
}: DashboardGridProps) {
	const { width, mounted, containerRef } = useContainerWidth({
		initialWidth: 1280,
	});

	if (!template) {
		return (
			<div className="flex min-h-[24rem] items-center justify-center p-6 text-sm text-muted-foreground">
				No hay una plantilla activa.
			</div>
		);
	}

	const layouts = getInteractiveLayouts(normalizeTemplateLayouts(template), mode);

	if (template.widgets.length === 0) {
		return (
			<div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/20 p-6 text-center">
				<div>
					<p className="text-sm font-medium">Esta plantilla no tiene widgets.</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Anade un widget para empezar a construir el resumen.
					</p>
				</div>
				{mode === "edit" ? (
					<Button type="button" onClick={onOpenAddWidget}>
						Anadir widget
					</Button>
				) : null}
			</div>
		);
	}

	return (
		<div ref={containerRef} className="w-full">
			{mounted ? (
				<ResponsiveGridLayout
					className="dashboard-grid"
					width={width}
					layouts={layouts}
					breakpoints={DASHBOARD_BREAKPOINTS}
					cols={DASHBOARD_COLS}
					rowHeight={DASHBOARD_ROW_HEIGHT}
					margin={DASHBOARD_MARGIN}
					containerPadding={[0, 0]}
					dragConfig={{
						enabled: mode === "edit",
						cancel:
							".dashboard-widget-no-drag,button,input,textarea,select,a,[role='button']",
					}}
					resizeConfig={{
						enabled: mode === "edit",
						handles: editResizeHandles,
					}}
					compactor={dashboardCompactor}
					onLayoutChange={(
						_currentLayout: unknown,
						allLayouts: Partial<Record<string, unknown>>,
					) => {
						if (mode === "edit") {
							onLayoutsChange(coerceLayouts(allLayouts));
						}
					}}
				>
					{template.widgets.map((widget) => (
						<div key={widget.id} className="min-h-0">
							<DashboardWidgetFrame
								widget={widget}
								mode={mode}
								selected={selectedWidgetId === widget.id}
								onSelect={onSelectWidget}
							/>
						</div>
					))}
				</ResponsiveGridLayout>
			) : null}
		</div>
	);
}
