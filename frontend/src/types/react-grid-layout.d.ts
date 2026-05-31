declare module "react-grid-layout" {
	import type { ComponentType, RefObject, ReactNode } from "react";

	export interface Layout {
		i: string;
		x: number;
		y: number;
		w: number;
		h: number;
		minW?: number;
		minH?: number;
		maxW?: number;
		maxH?: number;
		static?: boolean;
		isDraggable?: boolean;
		isResizable?: boolean;
		resizeHandles?: string[];
	}

	export type Layouts = Record<string, Layout[]>;

	export interface ResponsiveProps {
		className?: string;
		width?: number;
		layouts?: Layouts;
		breakpoints?: Record<string, number>;
		cols?: Record<string, number>;
		rowHeight?: number;
		margin?: [number, number];
		containerPadding?: [number, number];
		dragConfig?: {
			enabled?: boolean;
			bounded?: boolean;
			handle?: string;
			cancel?: string;
			threshold?: number;
		};
		resizeConfig?: {
			enabled?: boolean;
			handles?: string[];
			handleComponent?: ReactNode;
		};
		compactor?: GridCompactor;
		onLayoutChange?: (layout: Layout[], layouts: Layouts) => void;
		children?: ReactNode;
	}

	export interface GridCompactor {
		type: "vertical" | "horizontal" | null;
		allowOverlap: boolean;
		preventCollision?: boolean;
		compact: (layout: Layout[], cols: number) => Layout[];
	}

	export function getCompactor(
		compactType: "vertical" | "horizontal" | null,
		allowOverlap?: boolean,
		preventCollision?: boolean,
	): GridCompactor;

	export function useContainerWidth(options?: {
		measureBeforeMount?: boolean;
		initialWidth?: number;
	}): {
		width: number;
		mounted: boolean;
		containerRef: RefObject<HTMLDivElement | null>;
		measureWidth: () => void;
	};

	export const Responsive: ComponentType<ResponsiveProps>;
	export const ResponsiveGridLayout: ComponentType<ResponsiveProps>;
}
