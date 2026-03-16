import { SlidersHorizontal } from "lucide-react";

const PassNetworkFilters: React.FC = () => {
	return (
		<div className="flex h-full items-center justify-center p-4">
			<div className="text-center text-muted-foreground">
				<SlidersHorizontal className="mx-auto mb-2 size-8 opacity-40" />
				<p className="text-sm font-medium">Filtros de red de pases</p>
				<p className="mt-1 text-xs">Tabs listos. Filtros pendientes.</p>
			</div>
		</div>
	);
};

export default PassNetworkFilters;
