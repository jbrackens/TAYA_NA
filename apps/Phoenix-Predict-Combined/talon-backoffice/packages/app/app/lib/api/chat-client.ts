import { apiClient } from "./client";

export type ChatRoomInfo = {
  type: "global";
  id: string;
  displayName: string;
  readOnly: boolean;
};

type ChatRoomResponseRaw = {
  enabled: boolean;
  provider?: string;
  room?: {
    type: "global";
    id: string;
    display_name: string;
    read_only: boolean;
  };
  embed_url?: string;
  reason?: string;
};

type ChatSessionResponseRaw = {
  provider: string;
  room: {
    type: "global";
    id: string;
    display_name: string;
    read_only: boolean;
  };
  embed_url: string;
  expires_at: string;
};

export type ChatRoomResolution = {
  enabled: boolean;
  provider?: string;
  room?: ChatRoomInfo;
  embedUrl?: string;
  reason?: string;
};

export type ChatSession = {
  provider: string;
  room: ChatRoomInfo;
  embedUrl: string;
  expiresAt: string;
};

export type ChatReportRequest = {
  roomId: string;
  messageId: string;
  reason: string;
};

export type ChatReportResponse = {
  status: "accepted";
  reportId: string;
};

function normalizeRoom(
  room: ChatRoomResponseRaw["room"],
): ChatRoomInfo | undefined {
  if (!room) return undefined;
  return {
    type: "global",
    id: room.id,
    displayName: room.display_name,
    readOnly: room.read_only,
  };
}

export async function resolveChatRoom(): Promise<ChatRoomResolution> {
  const raw = await apiClient.get<ChatRoomResponseRaw>(
    "/api/v1/chat/rooms/resolve",
  );
  return {
    enabled: raw.enabled,
    provider: raw.provider,
    room: normalizeRoom(raw.room),
    embedUrl: raw.embed_url,
    reason: raw.reason,
  };
}

export async function createChatSession(): Promise<ChatSession> {
  const raw = await apiClient.post<ChatSessionResponseRaw>(
    "/api/v1/chat/session",
  );
  return {
    provider: raw.provider,
    room: normalizeRoom(raw.room)!,
    embedUrl: raw.embed_url,
    expiresAt: raw.expires_at,
  };
}

export async function reportChatMessage(
  report: ChatReportRequest,
): Promise<ChatReportResponse> {
  const raw = await apiClient.post<{ status: "accepted"; report_id: string }>(
    "/api/v1/chat/report",
    {
      room_id: report.roomId,
      message_id: report.messageId,
      reason: report.reason,
    },
  );
  return { status: raw.status, reportId: raw.report_id };
}
