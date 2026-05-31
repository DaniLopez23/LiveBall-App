import { Plus } from "lucide-react";

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
							onClick={() => {
								onAddWidget(definition.type);
								onOpenChange(false);
							}}
							className="flex min-h-32 flex-col items-start justify-between rounded-md border bg-background p-4 text-left transition-colors hover:bg-muted/45"
						>
							<span>
								<span className="block text-sm font-semibold">{definition.label}</span>
								<span className="mt-2 block text-sm text-muted-foreground">
									{definition.description}
								</span>
							</span>
							<span className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary">
								<Plus className="size-4" />
								Anadir
							</span>
						</button>
					))}
				</div>
				<div className="flex justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
