type BrowserProcessShim = {
	env?: Record<string, unknown>;
};

const browserGlobal = globalThis as typeof globalThis & {
	process?: BrowserProcessShim;
};

browserGlobal.process ??= { env: {} };
browserGlobal.process.env ??= {};
browserGlobal.process.env.DRAGGABLE_DEBUG ??= false;
