import { Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
	DashboardWidget,
	DashboardWidgetType,
} from "@/features/dashboard/types/dashboard.types";
import { SectionTitle, SelectField } from "@/features/dashboard/widgets/widgetControls";
import {
	widgetDefinitions,
	widgetRegistry,
} from "@/features/dashboard/widgets/widgetRegistry";

interface DashboardWidgetConfigPanelProps {
	widget: DashboardWidget | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdateWidget: (widgetId: string, patch: Partial<DashboardWidget>) => void;
	onUpdateWidgetType: (widgetId: string, type: DashboardWidgetType) => void;
	onRemoveWidget: (widgetId: string) => void;
}

export function DashboardWidgetConfigPanel({
	widget,
	open,
	onOpenChange,
	onUpdateWidget,
	onUpdateWidgetType,
	onRemoveWidget,
}: DashboardWidgetConfigPanelProps) {
	const definition = widget ? widgetRegistry[widget.type] : null;
	const ConfigComponent = definition?.configComponent;
	const FilterComponent = definition?.filterComponent;

	if (!open) {
		return null;
	}

	return (
		<aside className="fixed inset-y-0 right-0 z-40 flex w-[min(92vw,28rem)] flex-col border-l bg-background shadow-xl">
			<div className="flex items-start justify-between gap-3 border-b p-4">
				<div className="min-w-0">
					<h2 className="text-base font-semibold">Configurar widget</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Ajusta tipo, titulo, configuracion y filtros por defecto.
					</p>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={() => onOpenChange(false)}
				>
					<X className="size-4" />
					<span className="sr-only">Cerrar panel</span>
				</Button>
			</div>

			{widget && definition && ConfigComponent && FilterComponent ? (
				<div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-4">
					<div className="grid gap-3">
						<SectionTitle>Widget</SectionTitle>
						<label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
							Titulo
							<Input
								value={widget.title}
								onChange={(event) =>
									onUpdateWidget(widget.id, { title: event.target.value })
								}
							/>
						</label>
						<SelectField
							label="Tipo"
							value={widget.type}
							onChange={(type) => onUpdateWidgetType(widget.id, type as DashboardWidgetType)}
							options={widgetDefinitions.map((item) => ({
								value: item.type,
								label: item.label,
							}))}
						/>
					</div>

					<div className="grid gap-3">
						<SectionTitle>Configuracion</SectionTitle>
						<ConfigComponent
							key={`${widget.id}-${widget.type}-config`}
							value={widget.config}
							onChange={(config) => onUpdateWidget(widget.id, { config })}
						/>
					</div>

					<div className="grid gap-3">
						<SectionTitle>Filtros por defecto</SectionTitle>
						<FilterComponent
							key={`${widget.id}-${widget.type}-filters`}
							value={widget.filters}
							onChange={(filters) => onUpdateWidget(widget.id, { filters })}
						/>
					</div>
				</div>
			) : (
				<div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
					Selecciona un widget del grid para configurarlo.
				</div>
			)}

			{widget ? (
				<div className="mt-auto border-t p-4">
					<Button
						type="button"
						variant="destructive"
						onClick={() => {
							onRemoveWidget(widget.id);
							onOpenChange(false);
						}}
					>
						<Trash2 className="size-4" />
						Eliminar widget
					</Button>
				</div>
			) : null}
		</aside>
	);
}
