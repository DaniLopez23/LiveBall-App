import type { AvailableMatch } from "@/types/availableMatch";

const getDefaultApiBaseUrl = (): string => window.location.origin;

const normalizeBaseHttpUrl = (rawBase?: string): string => {
	const base = rawBase?.trim() || getDefaultApiBaseUrl();
	return base.endsWith("/") ? base.slice(0, -1) : base;
};

export const API_BASE_URL = normalizeBaseHttpUrl(import.meta.env.VITE_API_URL);

const MATCHES_REQUEST_TIMEOUT_MS = 10_000;

class MatchesRequestError extends Error {}

export const buildApiUrl = (path: string): string => {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${API_BASE_URL}${normalizedPath}`;
};

export const getAvailableMatches = async (): Promise<AvailableMatch[]> => {
	const controller = new AbortController();
	const timeoutId = window.setTimeout(
		() => controller.abort(),
		MATCHES_REQUEST_TIMEOUT_MS,
	);

	try {
		const response = await fetch(buildApiUrl("/api/v1/games"), {
			cache: "no-store",
			signal: controller.signal,
		});

		if (!response.ok) {
			if (response.status >= 500) {
				throw new MatchesRequestError(
					"El servidor todavía está preparando los partidos. Inténtalo de nuevo en unos segundos.",
				);
			}

			throw new MatchesRequestError(
				`No se pudieron cargar los partidos (${response.status}).`,
			);
		}

		let data: unknown;
		try {
			data = await response.json();
		} catch {
			throw new MatchesRequestError(
				"El servidor devolvió una respuesta de partidos no válida.",
			);
		}
		if (!Array.isArray(data)) {
			throw new MatchesRequestError(
				"El servidor devolvió una respuesta de partidos no válida.",
			);
		}

		return data as AvailableMatch[];
	} catch (error) {
		if (error instanceof MatchesRequestError) {
			throw error;
		}
		if (error instanceof DOMException && error.name === "AbortError") {
			throw new MatchesRequestError(
				"El servidor está tardando demasiado en responder. Vuelve a intentarlo.",
			);
		}

		throw new MatchesRequestError(
			"No se pudo conectar con el servidor. Comprueba la conexión y vuelve a intentarlo.",
		);
	} finally {
		window.clearTimeout(timeoutId);
	}
};
