import React from "react";
import { RotateCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider-14";
import { cn } from "@/lib/utils";

export type NodePositionMode = "given" | "received" | "global";

export interface PassNetworkFiltersState {
	minPasses: number;
	minuteRange: [number, number];
	nodePositionMode: NodePositionMode;
}

export const DEFAULT_PASS_NETWORK_FILTERS: PassNetworkFiltersState = {
	minPasses: 3,
	minuteRange: [0, 90],
	nodePositionMode: "global",
};

interface PassNetworkFiltersProps {
	filters: PassNetworkFiltersState;
	onChange: (filters: PassNetworkFiltersState) => void;
}

const PassNetworkFilters: React.FC<PassNetworkFiltersProps> = ({
	filters,
	onChange,
}) => {

	return (
		<div className="flex flex-col gap-5 h-full">
			{/* Section 1: Relacion entre nodos */}
			<div>
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
					Pases minimos por relacion
				</p>
				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground w-4 text-right">1</span>
					<Slider
						min={1}
						max={20}
						step={1}
						value={[filters.minPasses]}
						onValueChange={(v) =>
							onChange({
								...filters,
								minPasses: v[0] ?? 1,
							})
						}
						className="flex-1"
					/>
					<span className="text-xs font-semibold text-foreground w-8 text-right">
						{filters.minPasses}
					</span>
				</div>
			</div>

			<Separator />

			{/* Section 2: Momento */}
			<div>
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
					Momento
				</p>
				<div className="flex items-center gap-2 mb-3">
					<span className="text-xs text-muted-foreground w-6 text-right">
						{filters.minuteRange[0]}&apos;
					</span>
					<Slider
						min={0}
						max={90}
						step={1}
						value={filters.minuteRange}
						onValueChange={(v) =>
							onChange({
								...filters,
								minuteRange: [v[0], v[1]] as [number, number],
							})
						}
						className="flex-1"
					/>
					<span className="text-xs text-muted-foreground w-6">
						{filters.minuteRange[1]}&apos;
					</span>
				</div>
				<div className="flex gap-1">
					{([
						{ label: "1ª Parte", range: [0, 45] as [number, number] },
						{ label: "2ª Parte", range: [45, 90] as [number, number] },
						{ label: "Completo", range: [0, 90] as [number, number] },
					] as const).map(({ label, range }) => {
						const active =
							filters.minuteRange[0] === range[0] &&
							filters.minuteRange[1] === range[1];
						return (
							<button
								key={label}
								type="button"
								onClick={() =>
									onChange({
										...filters,
										minuteRange: range,
									})
								}
								className={cn(
									"flex-1 rounded-md border px-1 py-1 text-xs transition-colors",
									active
										? "bg-primary text-primary-foreground border-primary"
										: "bg-background text-muted-foreground border-input hover:bg-muted/60 hover:text-foreground",
								)}
							>
								{label}
							</button>
						);
					})}
				</div>
			</div>

			<Separator />

			{/* Section 3: Posicion media del nodo */}
			<div>
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
					Posicion media del Jugador (Nodo)
				</p>
				<div className="flex flex-col gap-1">
					{([
						{ label: "Posicion media global", value: "global" as const },
						{ label: "Posicion media dando el pase", value: "given" as const },
						{ label: "Posicion media recibiendo el pase", value: "received" as const },
					] as const).map((option) => {
						const active = filters.nodePositionMode === option.value;
						return (
							<button
								key={option.value}
								type="button"
								onClick={() =>
									onChange({
										...filters,
										nodePositionMode: option.value,
									})
								}
								className={cn(
									"w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
									active
										? "bg-primary text-primary-foreground border-primary"
										: "bg-background text-muted-foreground border-input hover:bg-muted/60 hover:text-foreground",
								)}
							>
								{option.label}
							</button>
						);
					})}
				</div>
			</div>

			<Separator />

			<button
				type="button"
				onClick={() => onChange(DEFAULT_PASS_NETWORK_FILTERS)}
				className="mt-auto inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
			>
				<RotateCcw className="size-3.5" />
				Reestablecer filtros por defecto
			</button>
		</div>
	);
};

export default PassNetworkFilters;
