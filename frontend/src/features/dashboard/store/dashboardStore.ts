import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
	DashboardLayouts,
	DashboardMode,
	DashboardTemplate,
	DashboardWidget,
	DashboardWidgetType,
} from "@/features/dashboard/types/dashboard.types";
import {
	createDashboardTemplate,
	createDashboardWidget,
	createInitialDashboardTemplates,
	duplicateDashboardTemplate,
	nowIso,
} from "@/features/dashboard/utils/dashboardDefaults";
import {
	addWidgetToLayouts,
	normalizeTemplateLayouts,
	removeWidgetFromLayouts,
} from "@/features/dashboard/utils/dashboardLayout";
import { getWidgetDefinition } from "@/features/dashboard/widgets/widgetRegistry";

interface DashboardStoreState {
	templates: DashboardTemplate[];
	activeTemplateId: string | null;
	mode: DashboardMode;
	selectedWidgetId: string | null;
	ensureDefaultTemplate: () => void;
	setMode: (mode: DashboardMode) => void;
	setActiveTemplate: (templateId: string) => void;
	selectWidget: (widgetId: string | null) => void;
	createTemplate: (name?: string, description?: string) => DashboardTemplate;
	renameTemplate: (templateId: string, name: string) => void;
	updateTemplateDescription: (templateId: string, description: string) => void;
	duplicateTemplate: (templateId: string) => void;
	deleteTemplate: (templateId: string) => void;
	saveActiveTemplate: () => void;
	addWidget: (type: DashboardWidgetType) => void;
	updateWidget: (widgetId: string, patch: Partial<DashboardWidget>) => void;
	updateWidgetType: (widgetId: string, type: DashboardWidgetType) => void;
	removeWidget: (widgetId: string) => void;
	updateActiveTemplateLayouts: (layouts: DashboardLayouts) => void;
}

const initialTemplates = createInitialDashboardTemplates();

function updateTemplate(
	templates: DashboardTemplate[],
	templateId: string | null,
	updater: (template: DashboardTemplate) => DashboardTemplate,
) {
	if (!templateId) return templates;

	return templates.map((template) =>
		template.id === templateId ? updater(template) : template,
	);
}

function touchTemplate(template: DashboardTemplate): DashboardTemplate {
	return {
		...template,
		updatedAt: nowIso(),
	};
}

const useDashboardStore = create<DashboardStoreState>()(
	persist(
		(set, get) => ({
			templates: initialTemplates,
			activeTemplateId: initialTemplates[0]?.id ?? null,
			mode: "view",
			selectedWidgetId: null,
			ensureDefaultTemplate: () => {
				const { templates, activeTemplateId } = get();
				const hasTemplates = templates.length > 0;
				const activeTemplateExists = templates.some(
					(template) => template.id === activeTemplateId,
				);

				if (hasTemplates && activeTemplateExists) {
					return;
				}

				const nextTemplates = hasTemplates ? templates : createInitialDashboardTemplates();
				set({
					templates: nextTemplates,
					activeTemplateId: nextTemplates[0]?.id ?? null,
					selectedWidgetId: null,
				});
			},
			setMode: (mode) => {
				set({
					mode,
					selectedWidgetId: mode === "edit" ? get().selectedWidgetId : null,
				});
			},
			setActiveTemplate: (templateId) => {
				set({
					activeTemplateId: templateId,
					selectedWidgetId: null,
				});
			},
			selectWidget: (widgetId) => set({ selectedWidgetId: widgetId }),
			createTemplate: (name, description) => {
				const template = createDashboardTemplate(name, description);
				set((state) => ({
					templates: [...state.templates, template],
					activeTemplateId: template.id,
					mode: "edit",
					selectedWidgetId: null,
				}));
				return template;
			},
			renameTemplate: (templateId, name) => {
				const trimmedName = name.trim();
				if (!trimmedName) return;

				set((state) => ({
					templates: updateTemplate(state.templates, templateId, (template) =>
						touchTemplate({
							...template,
							name: trimmedName,
						}),
					),
				}));
			},
			updateTemplateDescription: (templateId, description) => {
				set((state) => ({
					templates: updateTemplate(state.templates, templateId, (template) =>
						touchTemplate({
							...template,
							description,
						}),
					),
				}));
			},
			duplicateTemplate: (templateId) => {
				const template = get().templates.find((item) => item.id === templateId);
				if (!template) return;

				const copy = duplicateDashboardTemplate(template);
				set((state) => ({
					templates: [...state.templates, copy],
					activeTemplateId: copy.id,
					mode: "edit",
					selectedWidgetId: null,
				}));
			},
			deleteTemplate: (templateId) => {
				set((state) => {
					const remainingTemplates = state.templates.filter(
						(template) => template.id !== templateId,
					);
					const nextTemplates =
						remainingTemplates.length > 0
							? remainingTemplates
							: createInitialDashboardTemplates();
					const activeTemplateId =
						state.activeTemplateId === templateId
							? nextTemplates[0]?.id ?? null
							: state.activeTemplateId;

					return {
						templates: nextTemplates,
						activeTemplateId,
						selectedWidgetId:
							state.activeTemplateId === templateId ? null : state.selectedWidgetId,
					};
				});
			},
			saveActiveTemplate: () => {
				set((state) => ({
					templates: updateTemplate(state.templates, state.activeTemplateId, touchTemplate),
					mode: "view",
					selectedWidgetId: null,
				}));
			},
			addWidget: (type) => {
				const definition = getWidgetDefinition(type);
				const widget = createDashboardWidget(type);

				set((state) => ({
					templates: updateTemplate(state.templates, state.activeTemplateId, (template) =>
						touchTemplate({
							...template,
							widgets: [...template.widgets, widget],
							layouts: addWidgetToLayouts(
								template.layouts,
								widget.id,
								definition.defaultLayout,
							),
						}),
					),
					mode: "edit",
					selectedWidgetId: widget.id,
				}));
			},
			updateWidget: (widgetId, patch) => {
				set((state) => ({
					templates: updateTemplate(state.templates, state.activeTemplateId, (template) =>
						touchTemplate({
							...template,
							widgets: template.widgets.map((widget) =>
								widget.id === widgetId
									? {
											...widget,
											...patch,
										}
									: widget,
							),
						}),
					),
				}));
			},
			updateWidgetType: (widgetId, type) => {
				const replacement = createDashboardWidget(type, { id: widgetId });

				set((state) => ({
					templates: updateTemplate(state.templates, state.activeTemplateId, (template) =>
						touchTemplate({
							...template,
							widgets: template.widgets.map((widget) =>
								widget.id === widgetId
									? {
											...widget,
											...replacement,
										}
									: widget,
							),
							layouts: normalizeTemplateLayouts({
								...template,
								widgets: template.widgets.map((widget) =>
									widget.id === widgetId ? replacement : widget,
								),
							}),
						}),
					),
				}));
			},
			removeWidget: (widgetId) => {
				set((state) => ({
					templates: updateTemplate(state.templates, state.activeTemplateId, (template) =>
						touchTemplate({
							...template,
							widgets: template.widgets.filter((widget) => widget.id !== widgetId),
							layouts: removeWidgetFromLayouts(template.layouts, widgetId),
						}),
					),
					selectedWidgetId:
						state.selectedWidgetId === widgetId ? null : state.selectedWidgetId,
				}));
			},
			updateActiveTemplateLayouts: (layouts) => {
				set((state) => ({
					templates: updateTemplate(state.templates, state.activeTemplateId, (template) =>
						touchTemplate({
							...template,
							layouts,
						}),
					),
				}));
			},
		}),
		{
			name: "liveball-dashboard-templates",
			version: 1,
			partialize: (state) => ({
				templates: state.templates,
				activeTemplateId: state.activeTemplateId,
				mode: state.mode,
			}),
		},
	),
);

export default useDashboardStore;
