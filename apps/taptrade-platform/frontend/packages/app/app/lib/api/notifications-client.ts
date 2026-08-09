/**
 * Notification inbox client — GET /api/v1/notifications and the mark-read
 * mutation. Best-effort like the wallet client: network failures resolve
 * to null/false and the bell simply shows its last known state.
 */

import { apiClient } from "./client";
import type { SettlementNoticePayload } from "../../components/prediction/notifications";

export interface UserNotification {
  id: number;
  kind: string;
  title: string;
  body: string;
  marketId?: string;
  payload: SettlementNoticePayload & Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

export interface NotificationInbox {
  items: UserNotification[];
  unreadCount: number;
}

export async function getNotifications(
  limit = 20,
): Promise<NotificationInbox | null> {
  try {
    const res = await apiClient.get<NotificationInbox>(
      "/api/v1/notifications",
      { limit: String(limit) },
    );
    if (!res || !Array.isArray(res.items)) return null;
    return { items: res.items, unreadCount: res.unreadCount ?? 0 };
  } catch {
    return null;
  }
}

export async function markAllNotificationsRead(): Promise<boolean> {
  try {
    await apiClient.post<{ markedRead: number }>(
      "/api/v1/notifications/read",
      { all: true },
    );
    return true;
  } catch {
    return false;
  }
}
