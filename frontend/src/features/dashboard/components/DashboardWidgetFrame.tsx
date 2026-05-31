import { useEffect, useState } from "react";
import { GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
	DashboardMode,
	DashboardWidget,
} from "@/features/dashboard/types/dashboard.types";
import { widgetRegistry } from "@/features/dashboard/widgets/widgetRegistry";

interface DashboardWidgetFrameProps {
	widget: DashboardWidget;
	mode: DashboardMode;
	selected: boolean;
	onSelect: (widgetId: string) => void;
}

export function DashboardWidgetFrame({
	widget,
	mode,
	selected,
	onSelect,
}: DashboardWidgetFrameProps) {
	const definition = widgetRegistry[widget.type];
	const [runtimeFilters, setRuntimeFilters] = useState(widget.filters);

	useEffect(() => {
		setRuntimeFilters(widget.filters);
	}, [widget.filters, widget.id, widget.type]);

	if (!definition) {
		return (
			<Card className="flex h-full border-destructive/40">
				<CardContent className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
					No existe un widget registrado para "{widget.type}".
				</CardContent>
			</Card>
		);
	}

	const WidgetComponent = definition.component;
	const FilterComponent = definition.filterComponent;
	const activeFilters = mode === "view" ? runtimeFilters : widget.filters;

	return (
		<Card
			className={cn(
				"flex h-full min-h-0 flex-col overflow-hidden transition-colors",
				mode === "edit" ? "cursor-grab select-none active:cursor-grabbing" : "",
				selected ? "border-primary ring-2 ring-primary/30" : "border-border",
			)}
			onClick={() => {
				if (mode === "edit") {
					onSelect(widget.id);
				}
			}}
		>
			<CardHeader
				className={cn(
					"dashboard-widget-drag-handle flex-row items-start justify-between gap-3 border-b p-3",
					mode === "edit" ? "cursor-grab active:cursor-grabbing" : "cursor-default",
				)}
			>
				<div className="min-w-0">
					<CardTitle className="truncate text-sm">{widget.title}</CardTitle>
					<div className="mt-1 flex items-center gap-2">
						<Badge variant="secondary" className="rounded-md">
							{definition.label}
						</Badge>
					</div>
				</div>
				{mode === "edit" ? (
					<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground">
						<GripVertical className="size-4" />
					</span>
				) : null}
			</CardHeader>
			<CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3">
				{mode === "view" ? (
					<details className="rounded-md border bg-muted/20">
						<summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
							Filtros
						</summary>
						<div className="max-h-72 overflow-auto border-t p-3">
							<FilterComponent
								value={runtimeFilters}
								onChange={(filters) => setRuntimeFilters(filters)}
							/>
						</div>
					</details>
				) : null}

				<div className="min-h-0 flex-1">
					<WidgetComponent
						widget={widget}
						config={widget.config}
						filters={activeFilters}
						mode={mode}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
