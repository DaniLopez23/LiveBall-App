import {
	Activity,
	ArrowRight,
	BarChart3,
	CircleHelp,
	Clock3,
	Database,
	Gauge,
	Home,
	LayoutDashboard,
	Network,
	Radio,
	ShieldCheck,
	SlidersHorizontal,
	Sparkles,
	Target,
	Users,
	Zap,
	type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PageGuide {
	title: string;
	path: string;
	icon: LucideIcon;
	description: string;
	features: string[];
	accentClassName: string;
}

const PAGE_GUIDES: PageGuide[] = [
	{
		title: "Inicio",
		path: "/",
		icon: Home,
		description:
			"Es el punto de entrada a LiveBall. Aquí se elige el partido que alimentará el resto del análisis.",
		features: [
			"Consulta los partidos disponibles y su estado.",
			"Filtra entre todos, en directo y finalizados.",
			"Selecciona un encuentro para acceder a sus datos.",
		],
		accentClassName:
			"bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
	},
	{
		title: "Resumen",
		path: "/dashboard",
		icon: LayoutDashboard,
		description:
			"Un panel configurable para reunir en una sola vista los indicadores que más interesan durante el partido.",
		features: [
			"Crea, renombra y cambia entre distintas plantillas.",
			"Añade, mueve, redimensiona y configura widgets.",
			"Combina eventos, tiros, pases, estadísticas, momentum y líneas temporales.",
		],
		accentClassName: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
	},
	{
		title: "Estadísticas",
		path: "/stats",
		icon: BarChart3,
		description:
			"Compara el rendimiento de ambos equipos y observa cómo evoluciona el partido más allá del marcador.",
		features: [
			"Revisa posesión, pases, tiro, defensa y disciplina.",
			"Explora las gráficas de evolución, posesión y momentum.",
			"Identifica jugadores destacados y analiza el mapa de tiros.",
		],
		accentClassName:
			"bg-violet-500/10 text-violet-700 dark:text-violet-300",
	},
	{
		title: "Redes de pases",
		path: "/pass-networks",
		icon: Network,
		description:
			"Representa la estructura de pase de cada equipo para descubrir asociaciones, posiciones medias y vías de progresión.",
		features: [
			"Compara las redes del equipo local y visitante.",
			"Ajusta el intervalo temporal y los filtros de la red.",
			"Reproduce la evolución del juego o vuelve al punto en directo.",
		],
		accentClassName: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
	},
	{
		title: "Eventos",
		path: "/events",
		icon: Zap,
		description:
			"Sitúa sobre el campo las acciones del partido y permite investigar tanto eventos aislados como secuencias completas.",
		features: [
			"Filtra por equipo, jugador, acción, periodo y minuto.",
			"Alterna entre eventos individuales y secuencias de juego.",
			"Consulta el detalle en tabla y selecciona acciones para visualizarlas.",
		],
		accentClassName: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
	},
];

const DATA_FEEDS = [
	{ code: "F24", label: "Eventos del partido" },
	{ code: "F9", label: "Estadísticas" },
	{ code: "F40", label: "Plantillas y jugadores" },
	{ code: "F42", label: "Calendario y resultados" },
];

const DATA_FLOW = [
	{
		icon: Database,
		label: "Fuente",
		value: "Feeds XML de Opta",
	},
	{
		icon: Clock3,
		label: "Simulación",
		value: "Llegada progresiva",
	},
	{
		icon: Radio,
		label: "Procesamiento",
		value: "Actualización continua",
	},
	{
		icon: Activity,
		label: "Visualización",
		value: "Análisis en LiveBall",
	},
];

function PageGuideCard({ guide }: { guide: PageGuide }) {
	const Icon = guide.icon;

	return (
		<Card className="group flex h-full flex-col overflow-hidden transition-colors hover:border-foreground/20">
			<CardHeader className="gap-3">
				<div
					className={cn(
						"flex size-11 items-center justify-center rounded-lg",
						guide.accentClassName,
					)}
				>
					<Icon className="size-5" />
				</div>
				<div className="space-y-1.5">
					<CardTitle className="text-lg">{guide.title}</CardTitle>
					<CardDescription className="leading-6">
						{guide.description}
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-5">
				<ul className="flex-1 space-y-2.5 text-sm text-muted-foreground">
					{guide.features.map((feature) => (
						<li key={feature} className="flex gap-2.5 leading-5">
							<span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/35" />
							<span>{feature}</span>
						</li>
					))}
				</ul>
				<Button asChild variant="ghost" className="w-fit px-0 hover:bg-transparent">
					<Link to={guide.path}>
						Abrir {guide.title.toLocaleLowerCase("es")}
						<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}

export default function HelpPage() {
	return (
		<div className="min-h-full bg-muted/20">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
				<header className="relative overflow-hidden rounded-2xl border bg-card px-6 py-8 shadow-sm sm:px-10 sm:py-12">
					<div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full bg-emerald-500/10 blur-3xl" />
					<div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-sky-500/10 blur-3xl" />

					<div className="relative max-w-3xl">
						<Badge
							variant="outline"
							className="mb-5 gap-1.5 border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
						>
							<CircleHelp className="size-3.5" />
							Centro de ayuda
						</Badge>
						<h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
							Entiende el partido. Decide qué mirar.
						</h1>
						<p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
							LiveBall transforma el flujo de datos de un partido de fútbol en
							visualizaciones claras e interactivas. Su objetivo es facilitar el
							análisis en tiempo real, desde una lectura rápida del encuentro hasta
							la exploración detallada de cada acción.
						</p>

						<nav
							aria-label="Contenido de la página de ayuda"
							className="mt-7 flex flex-wrap gap-2"
						>
							<Button asChild size="sm">
								<a href="#sobre-liveball">Qué es LiveBall</a>
							</Button>
							<Button asChild variant="outline" size="sm">
								<a href="#datos">Origen de los datos</a>
							</Button>
							<Button asChild variant="outline" size="sm">
								<a href="#paginas">Guía de páginas</a>
							</Button>
						</nav>
					</div>
				</header>

				<section id="sobre-liveball" className="scroll-mt-8 space-y-6">
					<div className="max-w-3xl">
						<p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
							01 · La aplicación
						</p>
						<h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
							Un espacio de análisis vivo y flexible
						</h2>
						<p className="mt-3 leading-7 text-muted-foreground">
							La información se actualiza conforme avanza el encuentro. LiveBall
							conecta la lectura del marcador con el contexto táctico: qué está
							ocurriendo, dónde sucede, cómo se relacionan los jugadores y cómo cambia
							el rendimiento de los equipos.
						</p>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						{[
							{
								icon: Gauge,
								title: "Lectura inmediata",
								text: "Marcador, estado, estadísticas y acciones relevantes en un mismo entorno.",
							},
							{
								icon: Target,
								title: "Análisis en profundidad",
								text: "Filtros temporales, campogramas y comparativas para investigar el juego.",
							},
							{
								icon: Sparkles,
								title: "Vista a tu medida",
								text: "Un resumen configurable con plantillas y widgets adaptados a cada análisis.",
							},
						].map((item) => (
							<Card key={item.title} className="bg-card/70">
								<CardHeader>
									<item.icon className="size-5 text-emerald-600 dark:text-emerald-400" />
									<CardTitle className="pt-2 text-base">{item.title}</CardTitle>
									<CardDescription className="leading-6">
										{item.text}
									</CardDescription>
								</CardHeader>
							</Card>
						))}
					</div>
				</section>

				<section id="datos" className="scroll-mt-8 space-y-6">
					<div className="max-w-3xl">
						<p className="text-sm font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
							02 · Los datos
						</p>
						<h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
							Datos Opta, reproducidos como un directo
						</h2>
						<p className="mt-3 leading-7 text-muted-foreground">
							La aplicación trabaja con feeds XML procedentes de Opta. Para poder
							demostrar y probar de forma repetible el comportamiento en tiempo real,
							los partidos se simulan: los eventos y las estadísticas de partidos
							registrados se entregan progresivamente, como si estuvieran llegando
							durante una retransmisión.
						</p>
					</div>

					<Card className="overflow-hidden border-sky-500/20 bg-sky-500/[0.04]">
						<CardContent className="p-5 sm:p-6">
							<div className="grid gap-3 lg:grid-cols-4">
								{DATA_FLOW.map((step, index) => (
									<div key={step.label} className="relative flex items-center gap-3">
										<div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border bg-background/80 p-3.5">
											<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300">
												<step.icon className="size-4.5" />
											</div>
											<div className="min-w-0">
												<p className="text-xs font-medium text-muted-foreground">
													{step.label}
												</p>
												<p className="truncate text-sm font-semibold">{step.value}</p>
											</div>
										</div>
										{index < DATA_FLOW.length - 1 ? (
											<ArrowRight className="hidden size-4 shrink-0 text-muted-foreground lg:block" />
										) : null}
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					<div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
						<Card>
							<CardHeader>
								<div className="flex items-center gap-2">
									<Database className="size-5 text-sky-600 dark:text-sky-400" />
									<CardTitle>Feeds utilizados</CardTitle>
								</div>
								<CardDescription>
									Cada feed aporta una pieza diferente del contexto del partido.
								</CardDescription>
							</CardHeader>
							<CardContent className="grid gap-3 sm:grid-cols-2">
								{DATA_FEEDS.map((feed) => (
									<div
										key={feed.code}
										className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
									>
										<Badge variant="secondary" className="rounded-md font-mono">
											{feed.code}
										</Badge>
										<span className="text-sm font-medium">{feed.label}</span>
									</div>
								))}
							</CardContent>
						</Card>

						<div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-5 sm:p-6">
							<div className="flex items-start gap-3">
								<ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
								<div>
									<h3 className="font-semibold">Importante</h3>
									<p className="mt-2 text-sm leading-6 text-muted-foreground">
										La simulación no es una retransmisión oficial en directo. Reproduce
										la llegada temporal de datos de partidos registrados para validar la
										interfaz, los cálculos y las visualizaciones en un entorno controlado.
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section id="paginas" className="scroll-mt-8 space-y-6">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
						<div className="max-w-3xl">
							<p className="text-sm font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
								03 · Guía de páginas
							</p>
							<h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
								Qué encontrarás en cada apartado
							</h2>
							<p className="mt-3 leading-7 text-muted-foreground">
								Las páginas de análisis se habilitan después de seleccionar un partido
								desde Inicio. Todas comparten el mismo encuentro y se actualizan con
								los datos disponibles en cada momento.
							</p>
						</div>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<SlidersHorizontal className="size-4" />
							Los filtros cambian la vista, no los datos de origen.
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{PAGE_GUIDES.map((guide) => (
							<PageGuideCard key={guide.title} guide={guide} />
						))}
					</div>
				</section>

				<section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
					<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
						<div>
							<div className="flex items-center gap-2">
								<Users className="size-5 text-emerald-600 dark:text-emerald-400" />
								<h2 className="text-xl font-semibold">Empieza en tres pasos</h2>
							</div>
							<div className="mt-5 grid gap-4 sm:grid-cols-3">
								{[
									["1", "Elige un partido", "Ve a Inicio y selecciona un encuentro."],
									["2", "Abre una vista", "Entra en Resumen, Estadísticas, Pases o Eventos."],
									["3", "Explora", "Ajusta filtros, tiempo y equipo según tu pregunta."],
								].map(([number, title, text]) => (
									<div key={number} className="flex gap-3">
										<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-300">
											{number}
										</span>
										<div>
											<p className="text-sm font-semibold">{title}</p>
											<p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p>
										</div>
									</div>
								))}
							</div>
						</div>
						<Button asChild size="lg">
							<Link to="/">
								Seleccionar un partido
								<ArrowRight className="size-4" />
							</Link>
						</Button>
					</div>
				</section>
			</div>
		</div>
	);
}
