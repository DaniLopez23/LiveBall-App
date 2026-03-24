import { BarChart2, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import PassNetworkFilters, { type PassNetworkFiltersState } from "./PassNetworkFilters";
import PassNetworkStats from "./PassNetworkStats";

interface PassNetworkTabsProps {
	isOpen: boolean;
	onToggle: () => void;
	filters: PassNetworkFiltersState;
	onFiltersChange: (filters: PassNetworkFiltersState) => void;
}

const triggerClassName =
	"bg-muted/60 hover:bg-muted border-b-border data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:border-border data-[state=active]:border-b-slate-100 dark:data-[state=active]:border-b-slate-800 h-full rounded-none rounded-t border border-transparent px-3 gap-1.5 text-xs data-[state=active]:-mb-px data-[state=active]:shadow-none!";

const toggleButtonClassName =
	"text-muted-foreground hover:text-foreground hover:bg-muted/60";

const PassNetworkTabs: React.FC<PassNetworkTabsProps> = ({
	isOpen,
	onToggle,
	filters,
	onFiltersChange,
}) => {
	if (!isOpen) {
		return (
			<div className="flex h-full items-center justify-center">
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					onClick={onToggle}
					className={toggleButtonClassName}
					aria-label="Mostrar panel"
				>
					<ChevronLeft className="size-4" />
				</Button>
			</div>
		);
	}

	return (
		<Tabs defaultValue="stats" className="flex h-full flex-col">
			<div className="flex items-center border-b shrink-0 px-2 bg-muted/40">
				<TabsList className="bg-transparent justify-start rounded-none border-0 p-0 h-10 gap-0">
					<TabsTrigger value="stats" className={triggerClassName}>
						<BarChart2 className="size-3.5" />
						Estadisticas
					</TabsTrigger>
					<TabsTrigger value="filters" className={triggerClassName}>
						<SlidersHorizontal className="size-3.5" />
						Filtros
					</TabsTrigger>
				</TabsList>

				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					onClick={onToggle}
					className={`ml-auto ${toggleButtonClassName}`}
					aria-label="Ocultar panel"
				>
					<ChevronRight className="size-4" />
				</Button>
			</div>

			<TabsContent value="stats" className="flex-1 overflow-auto p-3">
				<PassNetworkStats />
			</TabsContent>

			<TabsContent value="filters" className="flex-1 overflow-auto p-4">
				<PassNetworkFilters filters={filters} onChange={onFiltersChange} />
			</TabsContent>
		</Tabs>
	);
};

export default PassNetworkTabs;
