import { Eye, LayoutDashboard, Pencil, Plus, Save, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
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
	hasUnsavedChanges: boolean;
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
	hasUnsavedChanges,
	onModeChange,
	onTemplateChange,
	onOpenTemplateManager,
	onOpenAddWidget,
	onSaveTemplate,
}: DashboardTopBarProps) {
	const isEditMode = mode === "edit";
	const modeLabel = isEditMode ? "Modo edicion" : "Modo visualizacion";
	const modeDescription = isEditMode
		? "Arrastra, redimensiona y configura widgets"
		: "Consulta el resumen con filtros temporales";
	const ModeIcon = isEditMode ? Pencil : Eye;

	return (
		<header
			className={cn(
				"sticky top-0 z-20 border-b px-4 py-3 backdrop-blur transition-colors supports-[backdrop-filter]:bg-background/80",
				isEditMode
					? "border-amber-300 bg-amber-50/95 dark:border-amber-800 dark:bg-amber-950/35"
					: "border-sky-200 bg-sky-50/85 dark:border-sky-900 dark:bg-sky-950/25",
			)}
		>
			<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
					<div className="flex min-w-0 items-center gap-3">
						<span
							className={cn(
								"inline-flex size-9 shrink-0 items-center justify-center rounded-md",
								isEditMode
									? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
									: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100",
							)}
						>
							<LayoutDashboard className="size-4" />
						</span>
						<div className="min-w-0">
							<p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
								Plantilla seleccionada
							</p>
							<h1 className="truncate text-base font-semibold">
								{activeTemplate?.name ?? "Sin plantilla"}
							</h1>
							<div
								className={cn(
									"mt-1 inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-normal",
									isEditMode
										? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/80 dark:text-amber-50"
										: "border-sky-200 bg-white/80 text-sky-900 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-50",
								)}
							>
								<ModeIcon className="size-3" />
								<span>{modeLabel}</span>
								<span className="hidden normal-case text-muted-foreground sm:inline">
									{modeDescription}
								</span>
							</div>
						</div>
					</div>

					<div className="min-w-0 flex-1 lg:max-w-xs">
						<DashboardTemplateSelector
							templates={templates}
							activeTemplateId={activeTemplateId}
							disabled={isEditMode}
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
								{hasUnsavedChanges ? "Guardar cambios" : "Guardar plantilla"}
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
