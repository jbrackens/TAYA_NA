import { useEffect } from "react";
import * as Socket from "../../../core/websocket";

export default function useUpdateLockedPlayers(actions: any) {
  useEffect(() => {
    Socket.on("ws/player-locked", actions.updateLockedPlayers);

    return () => Socket.off("ws/player-locked", actions.updateLockedPlayers);
  }, [actions]);
}
