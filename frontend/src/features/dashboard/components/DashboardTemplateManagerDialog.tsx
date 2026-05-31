import { useEffect, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { DashboardTemplate } from "@/features/dashboard/types/dashboard.types";

interface DashboardTemplateManagerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	templates: DashboardTemplate[];
	activeTemplateId: string | null;
	onCreateTemplate: (name: string, description?: string) => void;
	onSelectTemplate: (templateId: string) => void;
	onRenameTemplate: (templateId: string, name: string) => void;
	onUpdateDescription: (templateId: string, description: string) => void;
	onDuplicateTemplate: (templateId: string) => void;
	onDeleteTemplate: (templateId: string) => void;
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
	onDuplicateTemplate,
	onDeleteTemplate,
}: DashboardTemplateManagerDialogProps) {
	const [newName, setNewName] = useState("");
	const [draftNames, setDraftNames] = useState<Record<string, string>>({});
	const [draftDescriptions, setDraftDescriptions] = useState<Record<string, string>>({});

	useEffect(() => {
		setDraftNames((current) => {
			const next = { ...current };
			for (const template of templates) {
				next[template.id] = next[template.id] ?? template.name;
			}
			return next;
		});
		setDraftDescriptions((current) => {
			const next = { ...current };
			for (const template of templates) {
				next[template.id] = next[template.id] ?? template.description ?? "";
			}
			return next;
		});
	}, [templates]);

	const handleCreate = () => {
		const trimmedName = newName.trim();
		if (!trimmedName) return;
		onCreateTemplate(trimmedName);
		setNewName("");
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85svh] max-w-3xl overflow-hidden p-0">
				<DialogHeader className="border-b p-6 pb-4">
					<DialogTitle>Gestionar plantillas</DialogTitle>
					<DialogDescription>
						Crea, renombra, duplica, borra y selecciona plantillas del dashboard.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 overflow-auto p-6">
					<div className="flex flex-col gap-2 rounded-md border bg-muted/25 p-3 sm:flex-row">
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
						<Button type="button" onClick={handleCreate} disabled={!newName.trim()}>
							<Plus className="size-4" />
							Crear
						</Button>
					</div>

					<div className="grid gap-3">
						{templates.map((template) => {
							const isActive = template.id === activeTemplateId;

							return (
								<div key={template.id} className="rounded-md border bg-background p-3">
									<div className="flex flex-col gap-3 lg:flex-row lg:items-start">
										<div className="grid min-w-0 flex-1 gap-2">
											<div className="flex items-center gap-2">
												<Input
													value={draftNames[template.id] ?? template.name}
													onChange={(event) =>
														setDraftNames((current) => ({
															...current,
															[template.id]: event.target.value,
														}))
													}
													onBlur={() =>
														onRenameTemplate(
															template.id,
															draftNames[template.id] ?? template.name,
														)
													}
													className="font-medium"
												/>
												{isActive ? (
													<Badge variant="secondary" className="rounded-md">
														Activa
													</Badge>
												) : null}
											</div>
											<Input
												value={draftDescriptions[template.id] ?? template.description ?? ""}
												onChange={(event) =>
													setDraftDescriptions((current) => ({
														...current,
														[template.id]: event.target.value,
													}))
												}
												onBlur={() =>
													onUpdateDescription(
														template.id,
														draftDescriptions[template.id] ?? "",
													)
												}
												placeholder="Descripcion opcional"
											/>
											<p className="text-xs text-muted-foreground">
												{template.widgets.length} widgets
											</p>
										</div>

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
												onClick={() => onDuplicateTemplate(template.id)}
											>
												<Copy className="size-4" />
												Duplicar
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
								</div>
							);
						})}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
