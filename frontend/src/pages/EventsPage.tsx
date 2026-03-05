import React from "react";
import EventsPitch from "@/components/pitch/EventsPitch";
import { type OptaEvent } from "@/components/pitch/figures/OptaMarkers";

// Sample pass sequence – Opta coordinates (0-100 range)
const SAMPLE_PASSES: OptaEvent[] = [
  {
    id: "1", event_id: "1", type_id: "1", event_name: "Pass",
    x: 100, y: 100, outcome: 1, team_id: "home",
    player_id: "101",
    qualifiers: [
      { qualifier_id: "140", qualifier_name: "Pass End X", value: "35" },
      { qualifier_id: "141", qualifier_name: "Pass End Y", value: "25" },
    ],
  },
  {
    id: "2", event_id: "2", type_id: "1", event_name: "Pass",
    x: 10, y: 10, outcome: 1, team_id: "home",
    player_id: "102",
    qualifiers: [
      { qualifier_id: "140", qualifier_name: "Pass End X", value: "60" },
      { qualifier_id: "141", qualifier_name: "Pass End Y", value: "40" },
    ],
  },
  {
    id: "3", event_id: "3", type_id: "1", event_name: "Pass",
    x: 60, y: 40, outcome: 0, team_id: "home",
    player_id: "103",
    qualifiers: [
      { qualifier_id: "140", qualifier_name: "Pass End X", value: "75" },
      { qualifier_id: "141", qualifier_name: "Pass End Y", value: "55" },
    ],
  },
  {
    id: "4", event_id: "4", type_id: "1", event_name: "Pass",
    x: 20, y: 60, outcome: 1, team_id: "away",
    player_id: "201",
    qualifiers: [
      { qualifier_id: "140", qualifier_name: "Pass End X", value: "45" },
      { qualifier_id: "141", qualifier_name: "Pass End Y", value: "70" },
    ],
  },
  {
    id: "5", event_id: "5", type_id: "1", event_name: "Pass",
    x: 45, y: 70, outcome: 1, team_id: "away",
    player_id: "202",
    qualifiers: [
      { qualifier_id: "140", qualifier_name: "Pass End X", value: "65" },
      { qualifier_id: "141", qualifier_name: "Pass End Y", value: "85" },
    ],
  },
  {
    id: "6", event_id: "6", type_id: "1", event_name: "Pass",
    x: 65, y: 85, outcome: 0, team_id: "away",
    player_id: "203",
    qualifiers: [
      { qualifier_id: "140", qualifier_name: "Pass End X", value: "50" },
      { qualifier_id: "141", qualifier_name: "Pass End Y", value: "95" },
    ],
  },
];

const TEAM_COLORS: Record<string, string> = {
  home: "#3b82f6",  // blue
  away: "#f97316",  // orange
};

const EventsPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div>
        <h1 className="text-2xl font-bold">Eventos</h1>
        <p className="text-sm text-muted-foreground">
          Pases de ejemplo — <span className="text-blue-500 font-medium">● Local</span>{" "}
          <span className="text-orange-500 font-medium">● Visitante</span>
          {"  "}· Flecha = éxito · Cruz = fallo
        </p>
      </div>

      <div className="flex-1 min-h-0 max-w-sm">
        <EventsPitch events={SAMPLE_PASSES} teamColors={TEAM_COLORS} />
      </div>
    </div>
  );
};

export default EventsPage;
