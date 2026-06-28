import type { AvailableMatch } from "@/types/availableMatch";

const getDefaultApiBaseUrl = (): string => window.location.origin;

const normalizeBaseHttpUrl = (rawBase?: string): string => {
	const base = rawBase?.trim() || getDefaultApiBaseUrl();
	return base.endsWith("/") ? base.slice(0, -1) : base;
};

export const API_BASE_URL = normalizeBaseHttpUrl(import.meta.env.VITE_API_URL);

export const buildApiUrl = (path: string): string => {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${API_BASE_URL}${normalizedPath}`;
};

export const getAvailableMatches = async (): Promise<AvailableMatch[]> => {
	const response = await fetch(buildApiUrl("/api/v1/games"));
	if (!response.ok) {
		throw new Error(`No se pudieron cargar los partidos (${response.status}).`);
	}
	return response.json() as Promise<AvailableMatch[]>;
};
