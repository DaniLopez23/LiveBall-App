import { useEffect, useState } from "react";
import { GripVertical, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
	onUpdateWidget: (widgetId: string, patch: Partial<DashboardWidget>) => void;
}

export function DashboardWidgetFrame({
	widget,
	mode,
	selected,
	onSelect,
	onUpdateWidget,
}: DashboardWidgetFrameProps) {
	const definition = widgetRegistry[widget.type];
	const [runtimeFilters, setRuntimeFilters] = useState(widget.filters);
	const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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
	const handleFilterChange = (filters: DashboardWidget["filters"]) => {
		if (mode === "view") {
			setRuntimeFilters(filters);
			return;
		}

		onUpdateWidget(widget.id, { filters });
	};

	return (
		<>
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
					<div className="dashboard-widget-no-drag flex shrink-0 items-center gap-1">
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							onClick={(event) => {
								event.stopPropagation();
								setIsFiltersOpen(true);
							}}
						>
							<SlidersHorizontal className="size-4" />
							<span className="sr-only">Abrir filtros</span>
						</Button>
						{mode === "edit" ? (
							<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground">
								<GripVertical className="size-4" />
							</span>
						) : null}
					</div>
				</CardHeader>
				<CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3">
					<div className="min-h-0 flex-1">
						<WidgetComponent
							widget={widget}
							config={widget.config}
							filters={activeFilters}
							mode={mode}
							onFiltersChange={handleFilterChange}
						/>
					</div>
				</CardContent>
			</Card>

			<Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
				<DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Filtros</DialogTitle>
						<DialogDescription>
							{mode === "edit"
								? "Define los filtros por defecto de este widget."
								: "Ajusta los filtros de visualizacion de este widget."}
						</DialogDescription>
					</DialogHeader>
					<FilterComponent
						key={`${widget.id}-${widget.type}-${mode}-filters`}
						value={activeFilters}
						onChange={handleFilterChange}
						config={widget.config}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
