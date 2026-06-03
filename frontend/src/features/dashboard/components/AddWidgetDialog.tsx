import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { DashboardWidgetType } from "@/features/dashboard/types/dashboard.types";
import { widgetDefinitions } from "@/features/dashboard/widgets/widgetRegistry";

interface AddWidgetDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAddWidget: (type: DashboardWidgetType) => void;
}

export function AddWidgetDialog({
	open,
	onOpenChange,
	onAddWidget,
}: AddWidgetDialogProps) {
	const [selectedType, setSelectedType] = useState<DashboardWidgetType | null>(null);
	const selectedDefinition = widgetDefinitions.find(
		(definition) => definition.type === selectedType,
	);

	useEffect(() => {
		if (!open) {
			setSelectedType(null);
		}
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Anadir widget</DialogTitle>
					<DialogDescription>
						Elige un tipo de widget para insertarlo en la plantilla activa.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-3 sm:grid-cols-2">
					{widgetDefinitions.map((definition) => (
						<button
							key={definition.type}
							type="button"
							onClick={() => setSelectedType(definition.type)}
							className="relative flex min-h-32 flex-col items-start justify-between rounded-md border bg-background p-4 text-left transition-colors hover:bg-muted/45 data-[selected=true]:border-primary data-[selected=true]:ring-2 data-[selected=true]:ring-primary/25"
							data-selected={selectedType === definition.type}
						>
							{selectedType === definition.type ? (
								<span className="absolute right-3 top-3 inline-flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
									<Check className="size-4" />
								</span>
							) : null}
							<span>
								<span className="block text-sm font-semibold">{definition.label}</span>
								<span className="mt-2 block text-sm text-muted-foreground">
									{definition.description}
								</span>
							</span>
							<span className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary">
								{selectedType === definition.type ? "Seleccionado" : "Seleccionar"}
							</span>
						</button>
					))}
				</div>
				<div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-sm text-muted-foreground">
						{selectedDefinition
							? selectedDefinition.description
							: "Selecciona un tipo para poder anadirlo."}
					</p>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
						<Button
							type="button"
							disabled={!selectedType}
							onClick={() => {
								if (!selectedType) return;
								onAddWidget(selectedType);
								onOpenChange(false);
							}}
						>
							<Plus className="size-4" />
							Anadir widget
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
