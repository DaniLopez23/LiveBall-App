import { BarChart2 } from "lucide-react";

const PassNetworkStats: React.FC = () => {
	return (
		<div className="flex h-full items-center justify-center p-4">
			<div className="text-center text-muted-foreground">
				<BarChart2 className="mx-auto mb-2 size-8 opacity-40" />
				<p className="text-sm font-medium">Estadisticas de red de pases</p>
				<p className="mt-1 text-xs">Panel preparado. Contenido pendiente.</p>
			</div>
		</div>
	);
};

export default PassNetworkStats;
