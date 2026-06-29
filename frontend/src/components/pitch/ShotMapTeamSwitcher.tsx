import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TeamSide } from "@/types/stats";

interface ShotMapTeamSwitcherProps {
	value: TeamSide;
	homeTeamName: string;
	awayTeamName: string;
	onValueChange: (team: TeamSide) => void;
	className?: string;
	ariaLabel?: string;
}

export default function ShotMapTeamSwitcher({
	value,
	homeTeamName,
	awayTeamName,
	onValueChange,
	className,
	ariaLabel = "Equipo cuyos tiros se muestran",
}: ShotMapTeamSwitcherProps) {
	return (
		<ToggleGroup
			type="single"
			value={value}
			variant="outline"
			size="sm"
			className={className}
			aria-label={ariaLabel}
			onValueChange={(nextValue) => {
				if (nextValue === "home" || nextValue === "away") {
					onValueChange(nextValue);
				}
			}}
		>
			<ToggleGroupItem
				value="home"
				className="min-w-0 flex-1 gap-1.5 bg-background px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50/80 dark:text-blue-400 dark:hover:bg-blue-950/35 data-[state=on]:border-blue-500 data-[state=on]:bg-blue-500/10"
			>
				<span className="size-2 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
				<span className="truncate">{homeTeamName}</span>
			</ToggleGroupItem>
			<ToggleGroupItem
				value="away"
				className="min-w-0 flex-1 gap-1.5 bg-background px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50/80 dark:text-rose-400 dark:hover:bg-rose-950/35 data-[state=on]:border-rose-500 data-[state=on]:bg-rose-500/10"
			>
				<span className="size-2 shrink-0 rounded-full bg-rose-500" aria-hidden="true" />
				<span className="truncate">{awayTeamName}</span>
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
