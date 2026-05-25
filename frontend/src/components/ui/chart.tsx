import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
	[key: string]: {
		label?: React.ReactNode;
		icon?: React.ComponentType;
	} & (
		| { color?: string; theme?: never }
		| { color?: never; theme: Record<keyof typeof THEMES, string> }
	);
};

type ChartContextProps = {
	config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
	const context = React.useContext(ChartContext);

	if (!context) {
		throw new Error("useChart must be used within a <ChartContainer />");
	}

	return context;
}

function ChartContainer({
	id,
	className,
	children,
	config,
	...props
}: React.ComponentProps<"div"> & {
	config: ChartConfig;
	children: React.ComponentProps<
		typeof RechartsPrimitive.ResponsiveContainer
	>["children"];
}) {
	const uniqueId = React.useId();
	const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

	return (
		<ChartContext.Provider value={{ config }}>
			<div
				data-chart={chartId}
				data-slot="chart"
				className={cn(
					"flex aspect-video justify-center text-xs",
					"[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
					"[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
					"[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
					"[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
					"[&_.recharts-radial-bar-background-sector]:fill-muted",
					"[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
					"[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
					"[&_.recharts-wrapper]:overflow-visible",
					"[&_.recharts-sector[stroke='#fff']]:stroke-background",
					"[&_.recharts-sector]:outline-hidden",
					"[&_.recharts-surface]:overflow-visible",
					"[&_.recharts-surface]:outline-hidden",
					className,
				)}
				{...props}
			>
				<ChartStyle id={chartId} config={config} />
				<RechartsPrimitive.ResponsiveContainer>
					{children}
				</RechartsPrimitive.ResponsiveContainer>
			</div>
		</ChartContext.Provider>
	);
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
	const colorConfig = Object.entries(config).filter(([, itemConfig]) => {
		return itemConfig.theme || itemConfig.color;
	});

	if (!colorConfig.length) {
		return null;
	}

	return (
		<style
			dangerouslySetInnerHTML={{
				__html: Object.entries(THEMES)
					.map(([theme, prefix]) => {
						const styles = colorConfig
							.map(([key, itemConfig]) => {
								const color =
									itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
									itemConfig.color;

								return color ? `  --color-${key}: ${color};` : null;
							})
							.filter(Boolean)
							.join("\n");

						return `${prefix} [data-chart=${id}] {\n${styles}\n}`;
					})
					.join("\n"),
			}}
		/>
	);
}

const ChartTooltip = RechartsPrimitive.Tooltip;
const ChartLegend = RechartsPrimitive.Legend;

type ChartPayloadItem = {
	color?: string;
	dataKey?: string | number;
	fill?: string;
	name?: string | number;
	payload?: Record<string, unknown>;
	value?: unknown;
};

function getPayloadConfigFromPayload(
	config: ChartConfig,
	payload: ChartPayloadItem,
	key: string,
) {
	const payloadPayload = payload.payload;
	let configLabelKey = key;

	if (
		key in payload &&
		typeof payload[key as keyof ChartPayloadItem] === "string"
	) {
		configLabelKey = payload[key as keyof ChartPayloadItem] as string;
	} else if (
		payloadPayload &&
		key in payloadPayload &&
		typeof payloadPayload[key] === "string"
	) {
		configLabelKey = payloadPayload[key] as string;
	}

	return config[configLabelKey] || config[key];
}

function ChartTooltipContent({
	active,
	payload,
	className,
	indicator = "dot",
	hideLabel = false,
	hideIndicator = false,
	label,
	labelFormatter,
	labelClassName,
	nameKey,
	labelKey,
	valueFormatter,
}: React.ComponentProps<"div"> & {
	active?: boolean;
	payload?: ChartPayloadItem[];
	indicator?: "line" | "dot" | "dashed";
	hideLabel?: boolean;
	hideIndicator?: boolean;
	label?: React.ReactNode;
	labelFormatter?: (label: React.ReactNode) => React.ReactNode;
	labelClassName?: string;
	nameKey?: string;
	labelKey?: string;
	valueFormatter?: (
		value: unknown,
		item: ChartPayloadItem,
		index: number,
	) => React.ReactNode;
}) {
	const { config } = useChart();

	const tooltipLabel = (() => {
		if (hideLabel) return null;

		const item = payload?.[0];
		const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
		const itemConfig = item ? getPayloadConfigFromPayload(config, item, key) : null;
		const value = labelKey ? itemConfig?.label : label ?? itemConfig?.label;

		if (labelFormatter) {
			return (
				<div className={cn("font-medium", labelClassName)}>
					{labelFormatter(value || label)}
				</div>
			);
		}

		if (value == null || value === "") return null;

		return (
			<div className={cn("font-medium", labelClassName)}>
				{value}
			</div>
		);
	})();

	if (!active || !payload?.length) {
		return null;
	}

	return (
		<div
			className={cn(
				"grid min-w-32 gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-xl",
				className,
			)}
		>
			{tooltipLabel}
			<div className="grid gap-1.5">
				{payload.map((item, index) => {
					const key = `${nameKey || item.name || item.dataKey || "value"}`;
					const itemConfig = getPayloadConfigFromPayload(config, item, key);
					const indicatorColor = item.color || item.fill;

					return (
						<div
							key={`${key}-${index}`}
							className="flex min-w-0 items-center gap-2"
						>
							{!hideIndicator && (
								<div
									className={cn(
										"shrink-0 rounded-[2px] border",
										{
											"h-2.5 w-2.5": indicator === "dot",
											"w-1": indicator === "line",
											"w-0 border-[1.5px] border-dashed bg-transparent":
												indicator === "dashed",
										},
									)}
									style={
										{
											backgroundColor:
												indicator === "dashed" ? "transparent" : indicatorColor,
											borderColor: indicatorColor,
										} as React.CSSProperties
									}
								/>
							)}
							<div className="flex flex-1 items-center justify-between gap-3 leading-none">
								<span className="text-muted-foreground">
									{itemConfig?.label || item.name}
								</span>
								<span className="font-mono font-medium tabular-nums text-foreground">
									{valueFormatter
										? valueFormatter(item.value, item, index)
										: String(item.value ?? "")}
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function ChartLegendContent({
	payload,
	className,
	nameKey,
}: React.ComponentProps<"div"> & {
	payload?: ChartPayloadItem[];
	nameKey?: string;
}) {
	const { config } = useChart();

	if (!payload?.length) {
		return null;
	}

	return (
		<div className={cn("flex items-center justify-center gap-4", className)}>
			{payload.map((item) => {
				const key = `${nameKey || item.dataKey || "value"}`;
				const itemConfig = getPayloadConfigFromPayload(config, item, key);

				return (
					<div
						key={key}
						className="flex items-center gap-1.5 text-xs text-muted-foreground"
					>
						<span
							className="size-2 shrink-0 rounded-[2px]"
							style={{ backgroundColor: item.color || item.fill }}
						/>
						{itemConfig?.label || String(item.value ?? "")}
					</div>
				);
			})}
		</div>
	);
}

export {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
};
