import time
import random
import copy
import threading
import xml.etree.ElementTree as ET
import math
from pathlib import Path
from datetime import datetime

# Configuración
DATA_EVENTS_PATH = Path(__file__).parent.parent / "data" / "events"
DATA_STATS_PATH = Path(__file__).parent.parent / "data" / "stats"
OUTPUT_PATH = Path(__file__).parent.parent.parent / "simulated-real-time-data"

SIMULATED_TEAM_STAT_TYPES = {
    "possession_percentage",
    "touches",
    "touches_in_opp_box",
    "poss_lost_all",
    "total_pass",
    "accurate_pass",
    "fwd_pass",
    "backward_pass",
    "total_final_third_passes",
    "successful_final_third_passes",
    "total_long_balls",
    "accurate_long_balls",
    "total_cross",
    "accurate_cross",
    "goals",
    "total_scoring_att",
    "ontarget_scoring_att",
    "shot_off_target",
    "blocked_scoring_att",
    "attempts_ibox",
    "attempts_obox",
    "big_chance_created",
    "big_chance_missed",
    "pen_area_entries",
    "final_third_entries",
    "total_att_assist",
    "total_tackle",
    "won_tackle",
    "interception",
    "ball_recovery",
    "total_clearance",
    "effective_clearance",
    "outfielder_block",
    "duel_won",
    "duel_lost",
    "aerial_won",
    "aerial_lost",
    "poss_won_def_3rd",
    "poss_won_mid_3rd",
    "poss_won_att_3rd",
    "attempts_conceded_ibox",
    "attempts_conceded_obox",
    "goals_conceded",
    "saves",
    "fk_foul_won",
    "fk_foul_lost",
    "total_yel_card",
    "total_red_card",
    "total_offside",
}

PERCENTAGE_TEAM_STAT_TYPES = {"possession_percentage"}


class StatsMinuteTrigger:
    """
    Sincroniza las stats con el minuto de partido observado en el feed F24.
    """

    def __init__(self):
        self._condition = threading.Condition()
        self._latest_minute = 0
        self._events_finished = False

    def notify_event_minute(self, minute: int) -> bool:
        """
        Avisa al hilo de stats cuando aparece un minuto nuevo >= 1.
        """
        if minute < 1:
            return False

        with self._condition:
            if minute <= self._latest_minute:
                return False

            self._latest_minute = minute
            self._condition.notify_all()
            return True

    def mark_events_finished(self):
        """
        Libera al hilo de stats si ya no llegaran mas eventos.
        """
        with self._condition:
            self._events_finished = True
            self._condition.notify_all()

    def wait_for_next_minute(self, processed_minute: int) -> int | None:
        """
        Espera hasta que el feed de eventos alcance un minuto posterior.
        """
        with self._condition:
            self._condition.wait_for(
                lambda: self._latest_minute > processed_minute or self._events_finished
            )

            if self._latest_minute > processed_minute:
                return self._latest_minute

            return None


def get_today_date_formatted() -> str:
    """
    Retorna la fecha actual en formato DDMMAA.
    Ej: 030226 para 03/02/2026
    """
    today = datetime.now()
    return today.strftime("%d%m%y")


def find_first_xml_file() -> Path:
    """
    Encuentra el primer archivo XML en data/events.
    """
    xml_files = list(DATA_EVENTS_PATH.glob("*.xml"))
    if not xml_files:
        raise FileNotFoundError(f"No XML files found in {DATA_EVENTS_PATH}")
    
    return xml_files[0]


def find_first_stats_xml_file() -> Path:
    """
    Encuentra el primer archivo XML en data/stats.
    """
    xml_files = list(DATA_STATS_PATH.glob("*.xml"))
    if not xml_files:
        raise FileNotFoundError(f"No XML files found in {DATA_STATS_PATH}")

    return xml_files[0]


def extract_game_attributes(source_xml: Path) -> dict:
    """
    Extrae los atributos del Game del archivo original.
    """
    tree = ET.parse(source_xml)
    root = tree.getroot()
    original_game = root.find("Game")
    
    if original_game is not None:
        return dict(original_game.attrib)
    return {}


def element_to_string(elem: ET.Element) -> str:
    """
    Convierte un elemento XML a string con indentación.
    """
    return ET.tostring(elem, encoding="unicode", method="xml")


def create_new_xml_streaming(
    source_xml: Path,
    output_filename: str,
    stats_trigger: StatsMinuteTrigger | None = None,
):
    """
    Lee eventos del XML fuente y los escribe en tiempo real en un nuevo archivo XML.
    Reescribe el archivo completo en cada evento para simular feeds de Opta.
    """
    print(f"📖 Leyendo eventos de: {source_xml}")
    print(f"⏱️  Escribiendo eventos con delays aleatorios (2-8 segundos):\n")
    
    # Crear carpeta de salida si no existe
    OUTPUT_PATH.mkdir(parents=True, exist_ok=True)
    
    output_file = OUTPUT_PATH / output_filename
    
    # Extraer atributos del Game original y timestamp del Games
    tree = ET.parse(source_xml)
    root = tree.getroot()
    games_timestamp = root.attrib.get("timestamp", datetime.now().isoformat())
    
    original_game = root.find("Game")
    game_attrs = dict(original_game.attrib) if original_game is not None else {}
    
    # Leer todos los eventos del archivo fuente
    all_events = []
    for event_elem in root.findall(".//Event"):
        all_events.append(event_elem)
    
    print(f"✅ {len(all_events)} eventos encontrados\n")
    
    # Procesar eventos uno a uno
    accumulated_events = []
    
    for idx, event_element in enumerate(all_events, 1):
        # Añadir evento a la lista acumulada
        accumulated_events.append(event_element)
        
        # Reescribir el archivo XML completo con todos los eventos hasta ahora
        games_elem = ET.Element("Games")
        games_elem.set("timestamp", games_timestamp)
        
        game_elem = ET.SubElement(games_elem, "Game")
        for attr_name, attr_value in game_attrs.items():
            game_elem.set(attr_name, attr_value)
        
        # Añadir todos los eventos acumulados
        for evt in accumulated_events:
            # Copiar el evento completo con sus hijos (Q elements)
            new_event = ET.Element("Event", evt.attrib)
            for q_elem in evt.findall("Q"):
                ET.SubElement(new_event, "Q", q_elem.attrib)
            game_elem.append(new_event)
        
        # Escribir el archivo XML completo
        tree_out = ET.ElementTree(games_elem)
        ET.indent(tree_out, space="  ")
        tree_out.write(output_file, encoding="utf-8", xml_declaration=True)
        
        # Mostrar información del evento
        event_id = event_element.get("event_id", "?")
        type_id = event_element.get("type_id", "?")
        team_id = event_element.get("team_id", "?")
        event_minute = _safe_int(event_element.get("min"), 0)
        stats_triggered = (
            stats_trigger.notify_event_minute(event_minute)
            if stats_trigger is not None
            else False
        )
        stats_message = f" | Stats trigger: min {event_minute}" if stats_triggered else ""
        
        # Delay aleatorio entre 2-8 segundos
        delay = random.uniform(2, 8)
        print(f"  [{idx:4d}] Event ID: {event_id:4s} | Type: {type_id:3s} | Team: {team_id:3s} | Min: {event_minute:3d} | Delay: {delay:.2f}s | Total acumulados: {len(accumulated_events)}{stats_message}")
        
        # Aplicar delay para simular datos en tiempo real
        time.sleep(delay)

    if stats_trigger is not None:
        stats_trigger.mark_events_finished()
    
    print(f"\n✅ Archivo generado: {output_file}")
    print(f"📊 Total eventos procesados: {len(accumulated_events)}")


def _safe_int(value: str | None, default: int = 0) -> int:
    """Convierte string a int de forma segura."""
    try:
        return int(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def _safe_float(value: str | None) -> float | None:
    """Convierte string a float si es posible."""
    if value is None:
        return None

    try:
        return float(value.strip())
    except (AttributeError, TypeError, ValueError):
        return None


def _decimal_places(value: str | None) -> int:
    """Detecta cuantos decimales trae un valor XML para respetar su formato."""
    if not value or "." not in value:
        return 0
    return len(value.rsplit(".", 1)[1].strip())


def _format_stat_value(value: float, decimal_places: int) -> str:
    """Formatea una stat simulada preservando enteros y porcentajes."""
    bounded_value = max(0, value)
    if decimal_places <= 0:
        return str(int(round(bounded_value)))
    return f"{bounded_value:.{decimal_places}f}"


def _read_match_time_stat(match_data_element: ET.Element, stat_type: str, default: int) -> int:
    for stat in match_data_element.findall("Stat"):
        if stat.attrib.get("Type") == stat_type:
            return max(1, _safe_int((stat.text or "").strip(), default))
    return default


def _collect_team_stat_baselines(match_data_element: ET.Element) -> list[dict[str, dict[str, float | int | None]]]:
    """
    Guarda los valores finales de TeamData/Stat, que son los que consume el backend.

    El XML F9 fuente representa el partido completo. Para simular tiempo real,
    cada update calcula una lectura acumulada a partir de estos valores finales.
    """
    baselines: list[dict[str, dict[str, float | int | None]]] = []

    for team_data in match_data_element.findall("TeamData"):
        team_baseline: dict[str, dict[str, float | int | None]] = {}

        for stat in team_data.findall("Stat"):
            stat_type = stat.attrib.get("Type", "")
            if stat_type not in SIMULATED_TEAM_STAT_TYPES:
                continue

            raw_total = (stat.text or "").strip()
            total = _safe_float(raw_total)
            if total is None:
                continue

            raw_fh = stat.attrib.get("FH")
            raw_sh = stat.attrib.get("SH")
            team_baseline[stat_type] = {
                "total": total,
                "fh": _safe_float(raw_fh),
                "sh": _safe_float(raw_sh),
                "decimals": max(
                    _decimal_places(raw_total),
                    _decimal_places(raw_fh),
                    _decimal_places(raw_sh),
                ),
                "seed": sum(ord(char) for char in f"{team_data.attrib.get('TeamRef', '')}:{stat_type}"),
            }

        baselines.append(team_baseline)

    return baselines


def _variation_multiplier(
    baseline: dict[str, float | int | None],
    current_time: int,
    target_time: int,
) -> float:
    progress = min(1.0, max(0.0, current_time / max(1, target_time)))
    seed = float(baseline.get("seed") or 0)
    wave = (
        math.sin(progress * math.tau * 2.7 + seed) * 0.34
        + math.sin(progress * math.tau * 6.1 + seed / 3.0) * 0.18
    )
    fade = 1 - progress * 0.2
    return max(0.25, 1 + wave * fade)


def _progress_value(
    final_value: float,
    current_time: int,
    target_time: int,
    baseline: dict[str, float | int | None],
) -> float:
    progress = min(1.0, max(0.0, current_time / max(1, target_time)))
    return final_value * progress * _variation_multiplier(
        baseline,
        current_time,
        target_time,
    )


def _period_progress_values(
    baseline: dict[str, float | int | None],
    current_time: int,
    first_half_time: int,
    second_half_time: int,
    target_time: int,
) -> tuple[float, float, float]:
    final_total = float(baseline["total"] or 0)
    final_fh = baseline.get("fh")
    final_sh = baseline.get("sh")

    if final_fh is None or final_sh is None:
        total = _progress_value(final_total, current_time, target_time, baseline)
        return total, total, 0

    final_fh = float(final_fh)
    final_sh = float(final_sh)
    multiplier = _variation_multiplier(baseline, current_time, target_time)

    if current_time <= first_half_time:
        fh_progress = min(1.0, max(0.0, current_time / max(1, first_half_time)))
        fh_value = final_fh * fh_progress * multiplier
        return fh_value, fh_value, 0

    sh_elapsed = min(second_half_time, max(0, current_time - first_half_time))
    sh_progress = min(1.0, max(0.0, sh_elapsed / max(1, second_half_time)))
    sh_value = final_sh * sh_progress * multiplier
    return final_fh + sh_value, final_fh, sh_value


def _percentage_value(final_value: float, current_time: int, target_time: int, team_index: int) -> float:
    """
    Los porcentajes no son acumulativos. Se hacen oscilar alrededor del valor final.
    Para posesion, las dos fases opuestas mantienen una lectura plausible.
    """
    phase = (current_time / max(1, target_time)) * math.tau
    direction = 1 if team_index % 2 == 0 else -1
    value = final_value + direction * math.sin(phase + 0.7) * 12.0
    return min(82.0, max(18.0, value))


def _simulate_team_stats(
    match_data_element: ET.Element,
    baselines: list[dict[str, dict[str, float | int | None]]],
    current_time: int,
    target_time: int,
    first_half_time: int,
    second_half_time: int,
) -> None:
    """
    Actualiza TeamData/Stat directos, que son los valores enviados al frontend.
    """
    for team_index, team_data in enumerate(match_data_element.findall("TeamData")):
        team_baseline = baselines[team_index] if team_index < len(baselines) else {}

        for stat in team_data.findall("Stat"):
            stat_type = stat.attrib.get("Type", "")
            baseline = team_baseline.get(stat_type)
            if baseline is None:
                continue

            decimals = int(baseline.get("decimals") or 0)

            if stat_type in PERCENTAGE_TEAM_STAT_TYPES:
                total_value = _percentage_value(
                    float(baseline["total"] or 0),
                    current_time,
                    target_time,
                    team_index,
                )
                stat.text = _format_stat_value(total_value, decimals)
                if "FH" in stat.attrib:
                    stat.set("FH", _format_stat_value(total_value, decimals))
                if "SH" in stat.attrib:
                    stat.set("SH", _format_stat_value(total_value, decimals))
                continue

            total_value, fh_value, sh_value = _period_progress_values(
                baseline,
                current_time,
                first_half_time,
                second_half_time,
                target_time,
            )
            stat.text = _format_stat_value(total_value, decimals)
            if "FH" in stat.attrib:
                stat.set("FH", _format_stat_value(fh_value, decimals))
            if "SH" in stat.attrib:
                stat.set("SH", _format_stat_value(sh_value, decimals))


def _smooth_stat_delta(current_value: int) -> int:
    """
    Devuelve una variacion visible para que el XML completo cambie entre updates.
    """
    if current_value == 0:
        return random.choice((0, 1, 2, 3, 4))

    if current_value < 5:
        return random.choice((-2, -1, 0, 1, 2, 3, 4))

    if current_value < 25:
        return random.choice((-7, -5, -3, 0, 3, 5, 7, 9))

    return random.choice((-16, -12, -8, -4, 0, 5, 9, 13, 18))


def _simulate_player_stats(match_data_element: ET.Element):
    """
    Recorre TeamData -> PlayerLineUp -> MatchPlayer -> Stat y aplica variaciones
    pequenas sobre el valor simulado anterior, manteniendo valores >= 0.
    """
    for team_data in match_data_element.findall("TeamData"):
        for match_player in team_data.findall("./PlayerLineUp/MatchPlayer"):
            for stat in match_player.findall("Stat"):
                raw_value = (stat.text or "").strip()
                if not raw_value:
                    continue

                try:
                    original_value = int(raw_value)
                except ValueError:
                    continue

                delta = _smooth_stat_delta(original_value)
                new_value = max(0, original_value + delta)
                stat.text = str(new_value)


def _update_match_time_stat(match_data_element: ET.Element, current_time: int):
    """
    Actualiza (o crea) el Stat Type=\"match_time\" dentro de MatchData.
    """
    match_time_stat = None
    for stat in match_data_element.findall("Stat"):
        if stat.attrib.get("Type") == "match_time":
            match_time_stat = stat
            break

    if match_time_stat is None:
        match_time_stat = ET.SubElement(match_data_element, "Stat", {"Type": "match_time"})

    match_time_stat.text = str(current_time)


def _write_stats_xml(root: ET.Element, output_file: Path):
    """
    Escribe el XML de stats manteniendo indentacion consistente.
    """
    tree_out = ET.ElementTree(root)
    ET.indent(tree_out, space="  ")
    tree_out.write(output_file, encoding="utf-8", xml_declaration=True)


def create_new_stats_streaming(
    source_xml: Path,
    output_filename: str,
    minute_trigger: StatsMinuteTrigger | None = None,
):
    """
    Simula evolución de stats F9 cuando el feed de eventos alcanza un minuto nuevo.
    - Ajusta stats numericas de TeamData para que el backend vea buckets distintos.
    - Mantiene variaciones suaves en cada MatchPlayer para que el XML completo evolucione.
    - Simula avance de MatchData/Stat[@Type='match_time'] usando el minuto del F24.
    """
    print(f"📖 Leyendo stats de: {source_xml}")
    print("⏱️  Actualizando stats cuando los eventos alcancen un minuto nuevo:\n")

    OUTPUT_PATH.mkdir(parents=True, exist_ok=True)
    output_file = OUTPUT_PATH / output_filename

    source_tree = ET.parse(source_xml)
    source_root = source_tree.getroot()

    target_match_time = 90
    source_match_data = source_root.find("./SoccerDocument/MatchData")
    if source_match_data is not None:
        for stat in source_match_data.findall("Stat"):
            if stat.attrib.get("Type") == "match_time":
                target_match_time = max(1, _safe_int((stat.text or "").strip(), 90))
                break

    if source_match_data is None:
        raise ValueError("No se encontro <MatchData> en el XML de stats")

    first_half_time = _read_match_time_stat(source_match_data, "first_half_time", 45)
    second_half_time = _read_match_time_stat(
        source_match_data,
        "second_half_time",
        max(1, target_match_time - first_half_time),
    )
    team_stat_baselines = _collect_team_stat_baselines(source_match_data)

    print(f"✅ Match time objetivo detectado: {target_match_time}\n")

    # Trabajamos sobre una copia persistente para que cada update se parezca al anterior.
    loop_root = copy.deepcopy(source_root)
    loop_match_data = loop_root.find("./SoccerDocument/MatchData")

    if loop_match_data is None:
        raise ValueError("No se encontro <MatchData> en el XML de stats")

    simulated_minute = 0
    _simulate_team_stats(
        loop_match_data,
        team_stat_baselines,
        simulated_minute,
        target_match_time,
        first_half_time,
        second_half_time,
    )
    _update_match_time_stat(loop_match_data, simulated_minute)
    _write_stats_xml(loop_root, output_file)

    while simulated_minute < target_match_time:
        if minute_trigger is None:
            time.sleep(random.uniform(17, 23))
            next_minute = simulated_minute + 1
        else:
            next_minute = minute_trigger.wait_for_next_minute(simulated_minute)
            if next_minute is None:
                break

        simulated_minute = min(next_minute, target_match_time)

        _simulate_player_stats(loop_match_data)
        _simulate_team_stats(
            loop_match_data,
            team_stat_baselines,
            simulated_minute,
            target_match_time,
            first_half_time,
            second_half_time,
        )
        _update_match_time_stat(loop_match_data, simulated_minute)
        _write_stats_xml(loop_root, output_file)

        print(
            f"  [MIN {simulated_minute:3d}/{target_match_time}] "
            "Stats actualizadas por trigger de eventos"
        )

    print(f"\n✅ Archivo de stats generado: {output_file}")
    print(f"📊 Iteraciones de stats procesadas: {simulated_minute}")


def main():
    """
    Función principal que ejecuta el script.
    """
    print("🏟️  Pitch Simulator - Real-time Event & Stats Generator\n")
    print("=" * 60)
    
    try:
        # Se mantiene por compatibilidad aunque hoy no se use para nombrado.
        _ = get_today_date_formatted()

        source_events_xml = find_first_xml_file()
        source_stats_xml = find_first_stats_xml_file()

        print(f"📁 Fuente eventos: {source_events_xml.name}")
        print(f"📁 Fuente stats:   {source_stats_xml.name}\n")

        stats_trigger = StatsMinuteTrigger()

        events_thread = threading.Thread(
            target=create_new_xml_streaming,
            args=(source_events_xml, "f24-simulated-data.xml", stats_trigger),
            daemon=True,
        )
        stats_thread = threading.Thread(
            target=create_new_stats_streaming,
            args=(source_stats_xml, "f9-simulated-data.xml", stats_trigger),
            daemon=True,
        )

        events_thread.start()
        stats_thread.start()

        events_thread.join()
        stats_trigger.mark_events_finished()
        stats_thread.join()
        
        print("\n" + "=" * 60)
        print("✨ Proceso completado exitosamente")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise


if __name__ == "__main__":
    main()
