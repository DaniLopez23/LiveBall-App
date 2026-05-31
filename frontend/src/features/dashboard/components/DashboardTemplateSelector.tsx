import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";

import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxTrigger,
	useComboboxAnchor,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DashboardTemplate } from "@/features/dashboard/types/dashboard.types";

interface DashboardTemplateSelectorProps {
	templates: DashboardTemplate[];
	activeTemplateId: string | null;
	onTemplateChange: (templateId: string) => void;
}

export function DashboardTemplateSelector({
	templates,
	activeTemplateId,
	onTemplateChange,
}: DashboardTemplateSelectorProps) {
	const anchor = useComboboxAnchor();
	const [query, setQuery] = useState("");
	const activeTemplate = templates.find((template) => template.id === activeTemplateId);
	const filteredTemplates = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase("es-ES");
		if (!normalizedQuery) return templates;

		return templates.filter((template) =>
			template.name.toLocaleLowerCase("es-ES").includes(normalizedQuery),
		);
	}, [query, templates]);

	return (
		<Combobox
			value={activeTemplateId ?? ""}
			onValueChange={(value) => {
				if (typeof value === "string" && value) {
					onTemplateChange(value);
				}
			}}
		>
			<div ref={anchor} className="w-full min-w-0 sm:w-72">
				<ComboboxTrigger className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors hover:bg-muted/50">
					<span className="min-w-0 flex-1 truncate text-left">
						{activeTemplate?.name ?? "Seleccionar plantilla"}
					</span>
				</ComboboxTrigger>
			</div>
			<ComboboxContent anchor={anchor}>
				<div className="border-b p-2">
					<div className="relative">
						<Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Buscar plantilla"
							className="pl-8"
						/>
					</div>
				</div>
				<ComboboxList>
					<ComboboxEmpty>No hay plantillas.</ComboboxEmpty>
					{filteredTemplates.map((template) => (
						<ComboboxItem key={template.id} value={template.id}>
							<span className="min-w-0 flex-1 truncate">{template.name}</span>
							<Check
								className={cn(
									"ml-auto size-4",
									template.id === activeTemplateId ? "opacity-100" : "opacity-0",
								)}
							/>
						</ComboboxItem>
					))}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
