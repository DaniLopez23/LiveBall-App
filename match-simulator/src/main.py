import time
import random
import copy
import threading
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime

# Configuración
DATA_EVENTS_PATH = Path(__file__).parent.parent / "data" / "events"
DATA_STATS_PATH = Path(__file__).parent.parent / "data" / "stats"
OUTPUT_PATH = Path(__file__).parent.parent.parent / "simulated-real-time-data"


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


def create_new_xml_streaming(source_xml: Path, output_filename: str):
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
        
        # Delay aleatorio entre 2-8 segundos
        delay = random.uniform(2, 8)
        print(f"  [{idx:4d}] Event ID: {event_id:4s} | Type: {type_id:3s} | Team: {team_id:3s} | Delay: {delay:.2f}s | Total acumulados: {len(accumulated_events)}")
        
        # Aplicar delay para simular datos en tiempo real
        time.sleep(delay)
    
    print(f"\n✅ Archivo generado: {output_file}")
    print(f"📊 Total eventos procesados: {len(accumulated_events)}")


def _safe_int(value: str | None, default: int = 0) -> int:
    """Convierte string a int de forma segura."""
    try:
        return int(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def _simulate_player_stats(match_data_element: ET.Element):
    """
    Recorre TeamData -> PlayerLineUp -> MatchPlayer -> Stat y aplica variaciones
    aleatorias de +/-20 sobre stats numéricas, manteniendo valores >= 0.
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

                delta = random.randint(-20, 20)
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


def create_new_stats_streaming(source_xml: Path, output_filename: str):
    """
    Simula evolución de stats F9 cada 20 (+/-3) segundos.
    - Ajusta stats numéricas de cada MatchPlayer con variación de +/-20.
    - Simula avance de MatchData/Stat[@Type='match_time'] hasta match_time original.
    """
    print(f"📖 Leyendo stats de: {source_xml}")
    print("⏱️  Actualizando stats cada ~20 segundos (+/-3):\n")

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

    print(f"✅ Match time objetivo detectado: {target_match_time}\n")

    # Partimos de 0 y avanzamos minuto a minuto para simular progreso del partido.
    simulated_minute = 0

    while simulated_minute < target_match_time:
        simulated_minute += 1

        # Trabajamos sobre copia profunda para conservar el XML fuente intacto.
        loop_root = copy.deepcopy(source_root)
        loop_match_data = loop_root.find("./SoccerDocument/MatchData")

        if loop_match_data is None:
            raise ValueError("No se encontró <MatchData> en el XML de stats")

        _simulate_player_stats(loop_match_data)
        _update_match_time_stat(loop_match_data, simulated_minute)

        tree_out = ET.ElementTree(loop_root)
        ET.indent(tree_out, space="  ")
        tree_out.write(output_file, encoding="utf-8", xml_declaration=True)

        delay = random.uniform(17, 23)
        print(
            f"  [MIN {simulated_minute:3d}/{target_match_time}] "
            f"Stats actualizadas | Delay: {delay:.2f}s"
        )

        if simulated_minute < target_match_time:
            time.sleep(delay)

    print(f"\n✅ Archivo de stats generado: {output_file}")
    print(f"📊 Iteraciones de stats procesadas: {target_match_time}")


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

        events_thread = threading.Thread(
            target=create_new_xml_streaming,
            args=(source_events_xml, "f24-simulated-data.xml"),
            daemon=True,
        )
        stats_thread = threading.Thread(
            target=create_new_stats_streaming,
            args=(source_stats_xml, "f9-simulated-data.xml"),
            daemon=True,
        )

        events_thread.start()
        stats_thread.start()

        events_thread.join()
        stats_thread.join()
        
        print("\n" + "=" * 60)
        print("✨ Proceso completado exitosamente")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise


if __name__ == "__main__":
    main()
