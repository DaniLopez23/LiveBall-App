import {
	DEFAULT_PASS_NETWORK_FILTERS,
	type PassNetworkFiltersState,
} from "@/components/pitch/passNetworkPitch/passNetworkFilters.types";

export type PassNetworkConfig = {
	showStats: boolean;
	showMoment: boolean;
	showFiltersInline: boolean;
};

export type PassNetworkWidgetFilters = PassNetworkFiltersState;

export const DEFAULT_PASS_NETWORK_CONFIG: PassNetworkConfig = {
	showStats: true,
	showMoment: false,
	showFiltersInline: false,
};

export const DEFAULT_PASS_NETWORK_WIDGET_FILTERS: PassNetworkWidgetFilters = {
	...DEFAULT_PASS_NETWORK_FILTERS,
};
