import type { IncomingWsMessage } from "@/types/websocket";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import usePassNetworksStore from "@/store/passNetworksStore";

export const applyWebsocketMessageToStores = (
	message: IncomingWsMessage,
): void => {
	switch (message.type) {
		case "match_state_snapshot": {
			useGameStore.getState().setFromSnapshot({
				game: message.game,
				totalEvents: message.total_events,
			});

			useEventsStore.getState().setFromSnapshot({
				gameId: message.game_id,
				events: message.events,
				lastEventId: message.last_event_id,
			});

			usePassNetworksStore.getState().setFromSnapshot({
				gameId: message.game_id,
				passNetworks: message.pass_networks,
			});
			return;
		}

		case "new_game":
		case "updated_game": {
			useGameStore.getState().upsertFromUpdate({
				data: message.data,
			});
			return;
		}

		case "new_events": {
			useEventsStore.getState().appendNewEvents({
				gameId: message.game_id,
				events: message.events,
			});
			const { gameId, events } = useEventsStore.getState();
			if (gameId === message.game_id) {
				useGameStore.getState().setTotalEvents(events.length);
			}
			return;
		}

		case "updated_events": {
			useEventsStore.getState().applyUpdatedEvents({
				gameId: message.game_id,
				events: message.events,
			});
			return;
		}

		case "pass_network_updated": {
			usePassNetworksStore.getState().applyIncrementalUpdate({
				gameId: message.game_id,
				teamId: message.team_id,
				nodes: message.nodes,
				edges: message.edges,
				statistics: message.statistics,
			});
			return;
		}

		default:
			return;
	}
};
