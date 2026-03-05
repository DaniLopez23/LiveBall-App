import time
import random
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime
from typing import Tuple

# Configuración
DATA_EVENTS_PATH = Path(__file__).parent.parent / "data" / "events"
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


def main():
    """
    Función principal que ejecuta el script.
    """
    print("🏟️  Pitch Simulator - Real-time Event Generator\n")
    print("=" * 60)
    
    try:
        # Obtener fecha actual en formato DDMMAA
        date_formatted = get_today_date_formatted()
        output_filename = f"{date_formatted}-00.xml"
        
        # Encontrar primer archivo XML
        source_xml = find_first_xml_file()
        print(f"📁 Usando archivo fuente: {source_xml.name}\n")
        
        # Crear nuevo XML con eventos en streaming
        create_new_xml_streaming(source_xml, "simulated-data.xml")
        
        print("\n" + "=" * 60)
        print("✨ Proceso completado exitosamente")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise


if __name__ == "__main__":
    main()
