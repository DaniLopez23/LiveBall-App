import { useEffect, useMemo, useState } from "react";

import { AddWidgetDialog } from "@/features/dashboard/components/AddWidgetDialog";
import { DashboardGrid } from "@/features/dashboard/components/DashboardGrid";
import { DashboardTemplateManagerDialog } from "@/features/dashboard/components/DashboardTemplateManagerDialog";
import { DashboardTopBar } from "@/features/dashboard/components/DashboardTopBar";
import { DashboardWidgetConfigPanel } from "@/features/dashboard/components/DashboardWidgetConfigPanel";
import useDashboardStore from "@/features/dashboard/store/dashboardStore";

export default function DashboardSummaryPage() {
	const templates = useDashboardStore((state) => state.templates);
	const activeTemplateId = useDashboardStore((state) => state.activeTemplateId);
	const mode = useDashboardStore((state) => state.mode);
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
	const duplicateTemplate = useDashboardStore((state) => state.duplicateTemplate);
	const deleteTemplate = useDashboardStore((state) => state.deleteTemplate);
	const saveActiveTemplate = useDashboardStore((state) => state.saveActiveTemplate);
	const addWidget = useDashboardStore((state) => state.addWidget);
	const updateWidget = useDashboardStore((state) => state.updateWidget);
	const updateWidgetType = useDashboardStore((state) => state.updateWidgetType);
	const removeWidget = useDashboardStore((state) => state.removeWidget);
	const updateActiveTemplateLayouts = useDashboardStore(
		(state) => state.updateActiveTemplateLayouts,
	);
	const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
	const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);

	useEffect(() => {
		ensureDefaultTemplate();
	}, [ensureDefaultTemplate]);

	const activeTemplate = useMemo(
		() => templates.find((template) => template.id === activeTemplateId) ?? null,
		[activeTemplateId, templates],
	);
	const selectedWidget =
		activeTemplate?.widgets.find((widget) => widget.id === selectedWidgetId) ?? null;

	return (
		<div className="flex min-h-full flex-col bg-muted/20">
			<DashboardTopBar
				mode={mode}
				templates={templates}
				activeTemplate={activeTemplate}
				activeTemplateId={activeTemplateId}
				onModeChange={setMode}
				onTemplateChange={setActiveTemplate}
				onOpenTemplateManager={() => setIsTemplateManagerOpen(true)}
				onOpenAddWidget={() => setIsAddWidgetOpen(true)}
				onSaveTemplate={saveActiveTemplate}
			/>

			<main className="mx-auto w-full max-w-[118rem] flex-1 p-4">
				<DashboardGrid
					template={activeTemplate}
					mode={mode}
					selectedWidgetId={selectedWidgetId}
					onSelectWidget={selectWidget}
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
				onDuplicateTemplate={duplicateTemplate}
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
		</div>
	);
}
