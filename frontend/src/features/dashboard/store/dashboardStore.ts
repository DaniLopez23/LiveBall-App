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
	BASE_TEMPLATE_NAME,
	OFFENSIVE_TEMPLATE_NAME,
	cloneValue,
	createDashboardTemplate,
	createDashboardWidget,
	createInitialDashboardTemplates,
	createOffensiveDashboardTemplate,
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
	draftTemplate: DashboardTemplate | null;
	mode: DashboardMode;
	hasUnsavedChanges: boolean;
	selectedWidgetId: string | null;
	ensureDefaultTemplate: () => void;
	setMode: (mode: DashboardMode) => void;
	setActiveTemplate: (templateId: string) => void;
	selectWidget: (widgetId: string | null) => void;
	createTemplate: (name?: string, description?: string) => DashboardTemplate | null;
	renameTemplate: (templateId: string, name: string) => boolean;
	updateTemplateDescription: (templateId: string, description: string) => void;
	duplicateTemplate: (templateId: string) => DashboardTemplate | null;
	deleteTemplate: (templateId: string) => void;
	saveActiveTemplate: () => void;
	discardActiveTemplateChanges: () => void;
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

function normalizeTemplateName(name: string) {
	return name.trim().toLocaleLowerCase("es-ES");
}

function templateNameExists(
	templates: DashboardTemplate[],
	name: string,
	excludeTemplateId?: string,
) {
	const normalizedName = normalizeTemplateName(name);
	if (!normalizedName) return false;

	return templates.some(
		(template) =>
			template.id !== excludeTemplateId &&
			normalizeTemplateName(template.name) === normalizedName,
	);
}

function getUniqueTemplateName(
	templates: DashboardTemplate[],
	baseName: string,
	excludeTemplateId?: string,
) {
	const trimmedBaseName = baseName.trim() || "Plantilla";
	if (!templateNameExists(templates, trimmedBaseName, excludeTemplateId)) {
		return trimmedBaseName;
	}

	let suffix = 2;
	let candidate = `${trimmedBaseName} ${suffix}`;
	while (templateNameExists(templates, candidate, excludeTemplateId)) {
		suffix += 1;
		candidate = `${trimmedBaseName} ${suffix}`;
	}

	return candidate;
}

function ensureUniqueTemplateNames(templates: DashboardTemplate[]) {
	return templates.reduce<DashboardTemplate[]>((nextTemplates, template) => {
		const uniqueName = getUniqueTemplateName(nextTemplates, template.name, template.id);
		nextTemplates.push(
			uniqueName === template.name
				? template
				: {
						...template,
						name: uniqueName,
					},
		);
		return nextTemplates;
	}, []);
}

function ensureExampleTemplates(templates: DashboardTemplate[]) {
	let nextTemplates = ensureUniqueTemplateNames(
		templates.length > 0 ? templates : createInitialDashboardTemplates(),
	);
	const hasBaseTemplate = nextTemplates.some(
		(template) =>
			normalizeTemplateName(template.name) === normalizeTemplateName(BASE_TEMPLATE_NAME),
	);
	const hasOffensiveTemplate = nextTemplates.some(
		(template) =>
			normalizeTemplateName(template.name) === normalizeTemplateName(OFFENSIVE_TEMPLATE_NAME),
	);

	if (!hasBaseTemplate) {
		nextTemplates = [createDashboardTemplate(), ...nextTemplates];
	}

	if (!hasOffensiveTemplate) {
		nextTemplates = [...nextTemplates, createOffensiveDashboardTemplate()];
	}

	return ensureUniqueTemplateNames(nextTemplates);
}

function getActiveTemplate(state: Pick<DashboardStoreState, "templates" | "activeTemplateId">) {
	return state.templates.find((template) => template.id === state.activeTemplateId) ?? null;
}

function areLayoutsEqual(first: DashboardLayouts, second: DashboardLayouts) {
	return JSON.stringify(first) === JSON.stringify(second);
}

function updateEditableTemplate(
	state: DashboardStoreState,
	updater: (template: DashboardTemplate) => DashboardTemplate,
): Partial<DashboardStoreState> {
	const sourceTemplate =
		state.mode === "edit" && state.draftTemplate
			? state.draftTemplate
			: getActiveTemplate(state);

	if (!sourceTemplate) {
		return {};
	}

	const nextTemplate = updater(cloneValue(sourceTemplate));

	if (state.mode === "edit" || state.draftTemplate) {
		return {
			mode: "edit",
			draftTemplate: nextTemplate,
			hasUnsavedChanges: true,
		};
	}

	return {
		templates: updateTemplate(state.templates, state.activeTemplateId, () =>
			touchTemplate(nextTemplate),
		),
	};
}

const useDashboardStore = create<DashboardStoreState>()(
	persist(
		(set, get) => ({
			templates: initialTemplates,
			activeTemplateId: initialTemplates[0]?.id ?? null,
			draftTemplate: null,
			mode: "view",
			hasUnsavedChanges: false,
			selectedWidgetId: null,
			ensureDefaultTemplate: () => {
				const { templates, activeTemplateId } = get();
				const nextTemplates = ensureExampleTemplates(templates);
				const activeTemplateExists = nextTemplates.some(
					(template) => template.id === activeTemplateId,
				);

				set({
					templates: nextTemplates,
					activeTemplateId: activeTemplateExists
						? activeTemplateId
						: nextTemplates[0]?.id ?? null,
					draftTemplate: null,
					mode: "view",
					hasUnsavedChanges: false,
					selectedWidgetId: null,
				});
			},
			setMode: (mode) => {
				set((state) => {
					if (mode === "edit") {
						const activeTemplate = getActiveTemplate(state);
						return {
							mode: "edit",
							draftTemplate: activeTemplate ? cloneValue(activeTemplate) : null,
							hasUnsavedChanges: false,
							selectedWidgetId: null,
						};
					}

					return {
						mode: "view",
						draftTemplate: null,
						hasUnsavedChanges: false,
						selectedWidgetId: null,
					};
				});
			},
			setActiveTemplate: (templateId) => {
				set({
					activeTemplateId: templateId,
					draftTemplate: null,
					mode: "view",
					hasUnsavedChanges: false,
					selectedWidgetId: null,
				});
			},
			selectWidget: (widgetId) => set({ selectedWidgetId: widgetId }),
			createTemplate: (name, description) => {
				const trimmedName = name?.trim() || "Nueva plantilla";
				if (templateNameExists(get().templates, trimmedName)) {
					return null;
				}

				const template = createDashboardTemplate(trimmedName, description);
				set((state) => ({
					templates: [...state.templates, template],
					activeTemplateId: template.id,
					mode: "edit",
					draftTemplate: cloneValue(template),
					hasUnsavedChanges: false,
					selectedWidgetId: null,
				}));
				return template;
			},
			renameTemplate: (templateId, name) => {
				const trimmedName = name.trim();
				if (!trimmedName || templateNameExists(get().templates, trimmedName, templateId)) {
					return false;
				}

				set((state) => ({
					templates: updateTemplate(state.templates, templateId, (template) =>
						touchTemplate({
							...template,
							name: trimmedName,
						}),
					),
				}));
				return true;
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
				if (!template) return null;

				const copy = duplicateDashboardTemplate(template);
				const uniqueCopy = {
					...copy,
					name: getUniqueTemplateName(get().templates, `${template.name} copia`),
				};
				set((state) => ({
					templates: [...state.templates, uniqueCopy],
					activeTemplateId: uniqueCopy.id,
					mode: "edit",
					draftTemplate: cloneValue(uniqueCopy),
					hasUnsavedChanges: false,
					selectedWidgetId: null,
				}));
				return uniqueCopy;
			},
			deleteTemplate: (templateId) => {
				set((state) => {
					const remainingTemplates = state.templates.filter(
						(template) => template.id !== templateId,
					);
					const nextTemplates =
						remainingTemplates.length > 0
							? ensureUniqueTemplateNames(remainingTemplates)
							: createInitialDashboardTemplates();
					const activeTemplateId =
						state.activeTemplateId === templateId
							? nextTemplates[0]?.id ?? null
							: state.activeTemplateId;

					return {
						templates: nextTemplates,
						activeTemplateId,
						draftTemplate: null,
						mode: "view",
						hasUnsavedChanges: false,
						selectedWidgetId:
							state.activeTemplateId === templateId ? null : state.selectedWidgetId,
					};
				});
			},
			saveActiveTemplate: () => {
				set((state) => {
					const draftTemplate = state.draftTemplate;

					return {
						templates:
							state.mode === "edit" && draftTemplate
								? updateTemplate(state.templates, state.activeTemplateId, () =>
										touchTemplate(draftTemplate),
									)
								: updateTemplate(state.templates, state.activeTemplateId, touchTemplate),
						mode: "view",
						draftTemplate: null,
						hasUnsavedChanges: false,
						selectedWidgetId: null,
					};
				});
			},
			discardActiveTemplateChanges: () => {
				set({
					mode: "view",
					draftTemplate: null,
					hasUnsavedChanges: false,
					selectedWidgetId: null,
				});
			},
			addWidget: (type) => {
				const definition = getWidgetDefinition(type);
				const widget = createDashboardWidget(type);

				set((state) => ({
					...updateEditableTemplate(state, (template) => ({
						...template,
						widgets: [...template.widgets, widget],
						layouts: addWidgetToLayouts(
							template.layouts,
							widget.id,
							definition.defaultLayout,
						),
					})),
					mode: "edit",
					selectedWidgetId: widget.id,
				}));
			},
			updateWidget: (widgetId, patch) => {
				set((state) => ({
					...updateEditableTemplate(state, (template) => ({
						...template,
						widgets: template.widgets.map((widget) =>
							widget.id === widgetId
								? {
										...widget,
										...patch,
									}
								: widget,
						),
					})),
				}));
			},
			updateWidgetType: (widgetId, type) => {
				const replacement = createDashboardWidget(type, { id: widgetId });

				set((state) => ({
					...updateEditableTemplate(state, (template) => {
						const widgets = template.widgets.map((widget) =>
							widget.id === widgetId
								? {
										...widget,
										...replacement,
									}
								: widget,
						);

						return {
							...template,
							widgets,
							layouts: normalizeTemplateLayouts({
								...template,
								widgets,
							}),
						};
					}),
				}));
			},
			removeWidget: (widgetId) => {
				set((state) => ({
					...updateEditableTemplate(state, (template) => ({
						...template,
						widgets: template.widgets.filter((widget) => widget.id !== widgetId),
						layouts: removeWidgetFromLayouts(template.layouts, widgetId),
					})),
					selectedWidgetId:
						state.selectedWidgetId === widgetId ? null : state.selectedWidgetId,
				}));
			},
			updateActiveTemplateLayouts: (layouts) => {
				set((state) => ({
					...(() => {
						const currentTemplate =
							state.mode === "edit" && state.draftTemplate
								? state.draftTemplate
								: getActiveTemplate(state);

						if (currentTemplate && areLayoutsEqual(currentTemplate.layouts, layouts)) {
							return {};
						}

						return updateEditableTemplate(state, (template) => ({
							...template,
							layouts,
						}));
					})(),
				}));
			},
		}),
		{
			name: "liveball-dashboard-templates",
			version: 2,
			partialize: (state) => ({
				templates: state.templates,
				activeTemplateId: state.activeTemplateId,
			}),
			migrate: (persistedState) => {
				const state = persistedState as Partial<DashboardStoreState>;
				const templates = Array.isArray(state.templates) ? state.templates : initialTemplates;
				return {
					templates,
					activeTemplateId:
						typeof state.activeTemplateId === "string"
							? state.activeTemplateId
							: templates[0]?.id ?? null,
				};
			},
		},
	),
);

export default useDashboardStore;
