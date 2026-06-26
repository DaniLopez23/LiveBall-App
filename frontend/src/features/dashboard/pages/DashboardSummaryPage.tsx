import { useEffect, useMemo, useState } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddWidgetDialog } from "@/features/dashboard/components/AddWidgetDialog";
import { DashboardGrid } from "@/features/dashboard/components/DashboardGrid";
import { DashboardTemplateManagerDialog } from "@/features/dashboard/components/DashboardTemplateManagerDialog";
import { DashboardTopBar } from "@/features/dashboard/components/DashboardTopBar";
import { DashboardWidgetConfigPanel } from "@/features/dashboard/components/DashboardWidgetConfigPanel";
import useDashboardStore from "@/features/dashboard/store/dashboardStore";
import { cn } from "@/lib/utils";

export default function DashboardSummaryPage() {
	const templates = useDashboardStore((state) => state.templates);
	const activeTemplateId = useDashboardStore((state) => state.activeTemplateId);
	const draftTemplate = useDashboardStore((state) => state.draftTemplate);
	const mode = useDashboardStore((state) => state.mode);
	const hasUnsavedChanges = useDashboardStore((state) => state.hasUnsavedChanges);
	const selectedWidgetId = useDashboardStore((state) => state.selectedWidgetId);
	const ensureDefaultTemplate = useDashboardStore((state) => state.ensureDefaultTemplate);
	const setMode = useDashboardStore((state) => state.setMode);
	const setActiveTemplate = useDashboardStore((state) => state.setActiveTemplate);
	const selectWidget = useDashboardStore((state) => state.selectWidget);
	const createTemplate = useDashboardStore((state) => state.createTemplate);
	const renameTemplate = useDashboardStore((state) => state.renameTemplate);
	const updateTemplateDescription = useDashboardStore(
		(state) => state.updateTemplateDescription,
	);
	const deleteTemplate = useDashboardStore((state) => state.deleteTemplate);
	const saveActiveTemplate = useDashboardStore((state) => state.saveActiveTemplate);
	const discardActiveTemplateChanges = useDashboardStore(
		(state) => state.discardActiveTemplateChanges,
	);
	const addWidget = useDashboardStore((state) => state.addWidget);
	const updateWidget = useDashboardStore((state) => state.updateWidget);
	const updateWidgetType = useDashboardStore((state) => state.updateWidgetType);
	const removeWidget = useDashboardStore((state) => state.removeWidget);
	const updateActiveTemplateLayouts = useDashboardStore(
		(state) => state.updateActiveTemplateLayouts,
	);
	const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
	const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
	const [isExitEditDialogOpen, setIsExitEditDialogOpen] = useState(false);

	useEffect(() => {
		ensureDefaultTemplate();
	}, [ensureDefaultTemplate]);

	const savedActiveTemplate = useMemo(
		() => templates.find((template) => template.id === activeTemplateId) ?? null,
		[activeTemplateId, templates],
	);
	const activeTemplate = mode === "edit" && draftTemplate ? draftTemplate : savedActiveTemplate;
	const selectedWidget =
		activeTemplate?.widgets.find((widget) => widget.id === selectedWidgetId) ?? null;
	const handleModeChange = (nextMode: typeof mode) => {
		if (mode === "edit" && nextMode === "view" && hasUnsavedChanges) {
			setIsExitEditDialogOpen(true);
			return;
		}

		setMode(nextMode);
	};

	return (
		<div
			className={cn(
				"flex min-h-full flex-col transition-colors",
				mode === "edit"
					? "bg-amber-50/45 dark:bg-amber-950/10"
					: "bg-muted/20",
			)}
		>
			<DashboardTopBar
				mode={mode}
				templates={templates}
				activeTemplate={activeTemplate}
				activeTemplateId={activeTemplateId}
				hasUnsavedChanges={hasUnsavedChanges}
				onModeChange={handleModeChange}
				onTemplateChange={setActiveTemplate}
				onOpenTemplateManager={() => setIsTemplateManagerOpen(true)}
				onOpenAddWidget={() => setIsAddWidgetOpen(true)}
				onSaveTemplate={saveActiveTemplate}
			/>

			<main className="w-full flex-1 p-4">
				<DashboardGrid
					template={activeTemplate}
					mode={mode}
					selectedWidgetId={selectedWidgetId}
					onSelectWidget={selectWidget}
					onUpdateWidget={updateWidget}
					onLayoutsChange={updateActiveTemplateLayouts}
					onOpenAddWidget={() => setIsAddWidgetOpen(true)}
				/>
			</main>

			<DashboardTemplateManagerDialog
				open={isTemplateManagerOpen}
				onOpenChange={setIsTemplateManagerOpen}
				templates={templates}
				activeTemplateId={activeTemplateId}
				onCreateTemplate={(name, description) => createTemplate(name, description)}
				onSelectTemplate={setActiveTemplate}
				onRenameTemplate={renameTemplate}
				onUpdateDescription={updateTemplateDescription}
				onDeleteTemplate={deleteTemplate}
			/>

			<AddWidgetDialog
				open={isAddWidgetOpen}
				onOpenChange={setIsAddWidgetOpen}
				onAddWidget={addWidget}
			/>

			<DashboardWidgetConfigPanel
				widget={selectedWidget}
				open={mode === "edit" && Boolean(selectedWidget)}
				onOpenChange={(open) => {
					if (!open) {
						selectWidget(null);
					}
				}}
				onUpdateWidget={updateWidget}
				onUpdateWidgetType={updateWidgetType}
				onRemoveWidget={removeWidget}
			/>

			<AlertDialog open={isExitEditDialogOpen} onOpenChange={setIsExitEditDialogOpen}>
				<AlertDialogContent className="max-w-xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
						<AlertDialogDescription>
							Has hecho cambios en esta plantilla. Puedes guardarlos o salir sin
							guardar para volver a la version anterior.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
						<AlertDialogCancel className="h-auto min-h-10 w-full min-w-0 justify-center whitespace-normal px-3 text-center leading-tight">
							Seguir editando
						</AlertDialogCancel>
						<AlertDialogAction
							className="h-auto min-h-10 w-full min-w-0 justify-center whitespace-normal bg-destructive px-3 text-center leading-tight text-white hover:bg-destructive/90"
							onClick={() => {
								discardActiveTemplateChanges();
								setIsExitEditDialogOpen(false);
							}}
						>
							Salir sin guardar
						</AlertDialogAction>
						<AlertDialogAction
							className="h-auto min-h-10 w-full min-w-0 justify-center whitespace-normal px-3 text-center leading-tight"
							onClick={() => {
								saveActiveTemplate();
								setIsExitEditDialogOpen(false);
							}}
						>
							Guardar cambios
						</AlertDialogAction>
					</div>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
