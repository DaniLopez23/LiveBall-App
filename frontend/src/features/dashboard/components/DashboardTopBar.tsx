import { Eye, LayoutDashboard, Pencil, Plus, Save, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
	DashboardMode,
	DashboardTemplate,
} from "@/features/dashboard/types/dashboard.types";
import { DashboardTemplateSelector } from "@/features/dashboard/components/DashboardTemplateSelector";

interface DashboardTopBarProps {
	mode: DashboardMode;
	templates: DashboardTemplate[];
	activeTemplate: DashboardTemplate | null;
	activeTemplateId: string | null;
	onModeChange: (mode: DashboardMode) => void;
	onTemplateChange: (templateId: string) => void;
	onOpenTemplateManager: () => void;
	onOpenAddWidget: () => void;
	onSaveTemplate: () => void;
}

export function DashboardTopBar({
	mode,
	templates,
	activeTemplate,
	activeTemplateId,
	onModeChange,
	onTemplateChange,
	onOpenTemplateManager,
	onOpenAddWidget,
	onSaveTemplate,
}: DashboardTopBarProps) {
	return (
		<header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
					<div className="flex min-w-0 items-center gap-3">
						<span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
							<LayoutDashboard className="size-4" />
						</span>
						<div className="min-w-0">
							<p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
								Plantilla seleccionada
							</p>
							<h1 className="truncate text-base font-semibold">
								{activeTemplate?.name ?? "Sin plantilla"}
							</h1>
						</div>
					</div>

					<div className="min-w-0 flex-1 lg:max-w-xs">
						<DashboardTemplateSelector
							templates={templates}
							activeTemplateId={activeTemplateId}
							onTemplateChange={onTemplateChange}
						/>
					</div>

					<ToggleGroup
						type="single"
						value={mode}
						onValueChange={(value) => {
							if (value === "view" || value === "edit") {
								onModeChange(value);
							}
						}}
						variant="outline"
						size="sm"
					>
						<ToggleGroupItem value="view">
							<Eye className="size-4" />
							Visualizacion
						</ToggleGroupItem>
						<ToggleGroupItem value="edit">
							<Pencil className="size-4" />
							Edicion
						</ToggleGroupItem>
					</ToggleGroup>
				</div>

				<div className="flex flex-wrap gap-2 xl:justify-end">
					{mode === "edit" ? (
						<>
							<Button type="button" variant="outline" onClick={onOpenAddWidget}>
								<Plus className="size-4" />
								Anadir widget
							</Button>
							<Button type="button" onClick={onSaveTemplate}>
								<Save className="size-4" />
								Guardar plantilla
							</Button>
						</>
					) : (
						<Button type="button" variant="outline" onClick={onOpenTemplateManager}>
							<Settings className="size-4" />
							Gestionar plantillas
						</Button>
					)}
				</div>
			</div>
		</header>
	);
}
