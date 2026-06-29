import React from "react";
import { HelpCircle } from "lucide-react";

import { PitchLegendPopup } from "@/components/pitch/PitchLegendPopup";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PitchInfoPopupProps {
	id: string;
	title: string;
	description: string;
	className?: string;
}

export function PitchInfoPopup({
	id,
	title,
	description,
	className,
}: PitchInfoPopupProps) {
	const [open, setOpen] = React.useState(false);
	const anchorRef = React.useRef<HTMLElement | null>(null);

	return (
		<>
			<span ref={anchorRef} className="inline-flex shrink-0">
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					className={cn("text-muted-foreground", className)}
					onClick={() => setOpen((value) => !value)}
					aria-label={`Ayuda sobre ${title}`}
					aria-expanded={open}
					aria-controls={id}
					title={`Ayuda sobre ${title}`}
				>
					<HelpCircle className="size-4" />
				</Button>
			</span>

			<PitchLegendPopup
				open={open}
				anchorRef={anchorRef}
				id={id}
				ariaLabel={`Ayuda sobre ${title}`}
				title={title}
				items={[{ label: "Cómo funciona", description }]}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
