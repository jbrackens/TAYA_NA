import { useEffect } from "react";
import * as Socket from "../../../core/websocket";

export default function useUpdateSidebarStatus(actions: any) {
  useEffect(() => {
    Socket.on("ws/sidebar-status", actions.updateSidebarStatus);
    Socket.emit("ws/sidebar-status-listening");

    return () => Socket.off("ws/sidebar-status", actions.updateSidebarStatus);
  }, [actions]);
}
