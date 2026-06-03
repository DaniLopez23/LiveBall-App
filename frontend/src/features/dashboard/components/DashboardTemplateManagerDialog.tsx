import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { DashboardTemplate } from "@/features/dashboard/types/dashboard.types";

interface DashboardTemplateManagerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	templates: DashboardTemplate[];
	activeTemplateId: string | null;
	onCreateTemplate: (name: string, description?: string) => DashboardTemplate | null;
	onSelectTemplate: (templateId: string) => void;
	onRenameTemplate: (templateId: string, name: string) => boolean;
	onUpdateDescription: (templateId: string, description: string) => void;
	onDeleteTemplate: (templateId: string) => void;
}

function normalizeName(name: string) {
	return name.trim().toLocaleLowerCase("es-ES");
}

function nameExists(
	templates: DashboardTemplate[],
	name: string,
	excludeTemplateId?: string,
) {
	const normalizedName = normalizeName(name);
	if (!normalizedName) return false;

	return templates.some(
		(template) =>
			template.id !== excludeTemplateId && normalizeName(template.name) === normalizedName,
	);
}

export function DashboardTemplateManagerDialog({
	open,
	onOpenChange,
	templates,
	activeTemplateId,
	onCreateTemplate,
	onSelectTemplate,
	onRenameTemplate,
	onUpdateDescription,
	onDeleteTemplate,
}: DashboardTemplateManagerDialogProps) {
	const [newName, setNewName] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editDescription, setEditDescription] = useState("");

	const trimmedNewName = newName.trim();
	const createNameExists = nameExists(templates, trimmedNewName);
	const editingTemplate = templates.find((template) => template.id === editingTemplateId);
	const trimmedEditName = editName.trim();
	const editNameExists = editingTemplate
		? nameExists(templates, trimmedEditName, editingTemplate.id)
		: false;

	const resetCreateForm = () => {
		setNewName("");
		setNewDescription("");
	};

	const startEditing = (template: DashboardTemplate) => {
		setEditingTemplateId(template.id);
		setEditName(template.name);
		setEditDescription(template.description ?? "");
	};

	const stopEditing = () => {
		setEditingTemplateId(null);
		setEditName("");
		setEditDescription("");
	};

	const handleCreate = () => {
		if (!trimmedNewName || createNameExists) return;

		const template = onCreateTemplate(trimmedNewName, newDescription.trim() || undefined);
		if (!template) return;

		resetCreateForm();
		onOpenChange(false);
	};

	const handleSaveEdit = () => {
		if (!editingTemplate || !trimmedEditName || editNameExists) return;

		const renamed = onRenameTemplate(editingTemplate.id, trimmedEditName);
		if (!renamed) return;

		onUpdateDescription(editingTemplate.id, editDescription.trim());
		stopEditing();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85svh] max-w-3xl overflow-hidden p-0">
				<DialogHeader className="border-b p-6 pb-4">
					<DialogTitle>Gestionar plantillas</DialogTitle>
					<DialogDescription>
						Selecciona, crea, edita o borra plantillas. Cada nombre debe ser unico.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-5 overflow-auto p-6">
					<div className="grid gap-3 rounded-md border bg-muted/25 p-3">
						<div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
							<Input
								value={newName}
								onChange={(event) => setNewName(event.target.value)}
								placeholder="Nombre de nueva plantilla"
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										handleCreate();
									}
								}}
							/>
							<Input
								value={newDescription}
								onChange={(event) => setNewDescription(event.target.value)}
								placeholder="Descripcion"
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										handleCreate();
									}
								}}
							/>
							<Button
								type="button"
								onClick={handleCreate}
								disabled={!trimmedNewName || createNameExists}
							>
								<Plus className="size-4" />
								Crear
							</Button>
						</div>
						{createNameExists ? (
							<p className="text-xs font-medium text-destructive">
								Ya existe una plantilla con ese nombre.
							</p>
						) : null}
					</div>

					<div className="grid gap-3">
						{templates.map((template) => {
							const isActive = template.id === activeTemplateId;
							const isEditing = template.id === editingTemplateId;

							return (
								<div key={template.id} className="rounded-md border bg-background p-4">
									{isEditing ? (
										<div className="grid gap-3">
											<div className="grid gap-2 sm:grid-cols-2">
												<Input
													value={editName}
													onChange={(event) => setEditName(event.target.value)}
													placeholder="Nombre"
												/>
												<Input
													value={editDescription}
													onChange={(event) => setEditDescription(event.target.value)}
													placeholder="Descripcion"
												/>
											</div>
											{editNameExists ? (
												<p className="text-xs font-medium text-destructive">
													Ya existe una plantilla con ese nombre.
												</p>
											) : null}
											<div className="flex justify-end gap-2">
												<Button type="button" variant="outline" onClick={stopEditing}>
													Cancelar
												</Button>
												<Button
													type="button"
													onClick={handleSaveEdit}
													disabled={!trimmedEditName || editNameExists}
												>
													Guardar cambios
												</Button>
											</div>
										</div>
									) : (
										<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
											<button
												type="button"
												className="min-w-0 flex-1 text-left"
												onClick={() => onSelectTemplate(template.id)}
											>
												<div className="flex items-center gap-2">
													<h3 className="truncate text-sm font-semibold">{template.name}</h3>
													{isActive ? (
														<Badge variant="secondary" className="rounded-md">
															Activa
														</Badge>
													) : null}
												</div>
												<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
													{template.description || "Sin descripcion"}
												</p>
											</button>

											<div className="flex flex-wrap gap-2 lg:justify-end">
												<Button
													type="button"
													variant={isActive ? "secondary" : "outline"}
													size="sm"
													onClick={() => onSelectTemplate(template.id)}
												>
													Seleccionar
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => startEditing(template)}
												>
													<Pencil className="size-4" />
													Editar
												</Button>
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button type="button" variant="outline" size="sm">
															<Trash2 className="size-4" />
															Borrar
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>Borrar plantilla</AlertDialogTitle>
															<AlertDialogDescription>
																Se eliminara la plantilla "{template.name}". Si es la ultima,
																se creara una plantilla base nueva.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Cancelar</AlertDialogCancel>
															<AlertDialogAction
																className="bg-destructive text-white hover:bg-destructive/90"
																onClick={() => onDeleteTemplate(template.id)}
															>
																Borrar
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
