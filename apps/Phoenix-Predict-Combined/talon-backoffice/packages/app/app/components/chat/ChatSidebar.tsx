"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Flag,
  MessageCircle,
  X,
} from "lucide-react";
import { CHAT_PUBLIC_URL, FEATURE_CHAT } from "../../lib/features";
import {
  createChatSession,
  reportChatMessage,
  resolveChatRoom,
} from "../../lib/api/chat-client";
import { useAuth } from "../../hooks/useAuth";
import { logger } from "../../lib/logger";

const STORAGE_KEY = "hula_chat_collapsed";
const LOAD_TIMEOUT_MS = 5000;
const DEFAULT_ROOM_ID = "general";

type LoadState = "idle" | "loading" | "ready" | "unavailable";

export function ChatSidebar() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isDesktop, setIsDesktop] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [state, setState] = useState<LoadState>("idle");
  const [embedUrl, setEmbedUrl] = useState("");
  const [roomId, setRoomId] = useState(DEFAULT_ROOM_ID);
  const [message, setMessage] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportEnabled, setReportEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1100px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsed(localStorage.getItem(STORAGE_KEY) !== "false");
  }, []);

  const persistCollapsed = (next: boolean) => {
    setCollapsed(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(next));
    }
  };

  const publicGlobalUrl = useMemo(() => {
    if (!CHAT_PUBLIC_URL) return "";
    return `${CHAT_PUBLIC_URL}/channel/${DEFAULT_ROOM_ID}`;
  }, []);

  useEffect(() => {
    if (!FEATURE_CHAT || collapsed || !isDesktop || isLoading) return;
    let cancelled = false;
    const load = async () => {
      setState("loading");
      setMessage("");
      setReportEnabled(false);
      setEmbedUrl("");
      if (!isAuthenticated) {
        if (publicGlobalUrl) {
          setRoomId(DEFAULT_ROOM_ID);
          setEmbedUrl(publicGlobalUrl);
          setState("ready");
        } else {
          setState("unavailable");
          setMessage("Chat is not available right now");
        }
        return;
      }
      try {
        const room = await resolveChatRoom();
        if (cancelled) return;
        if (!room.enabled) {
          setState("unavailable");
          setMessage(room.reason || "Chat unavailable");
          return;
        }
        setRoomId(room.room?.id || "global");
        const session = await createChatSession();
        if (cancelled) return;
        setEmbedUrl(session.embedUrl);
        setReportEnabled(true);
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        logger.warn("Chat", "chat initialization failed", err);
        setState("unavailable");
        setMessage("Chat is not available right now");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [collapsed, isAuthenticated, isDesktop, isLoading, publicGlobalUrl]);

  const mobileChatUrl = useMemo(() => {
    return publicGlobalUrl;
  }, [publicGlobalUrl]);

  if (!FEATURE_CHAT) return null;

  if (!isDesktop) {
    return (
      <button
        className="chat-mobile-button"
        type="button"
        aria-label="Open chat"
        onClick={() => {
          if (mobileChatUrl) window.open(mobileChatUrl, "_blank", "noopener");
        }}
      >
        <MessageCircle size={20} aria-hidden="true" />
        <span>Chat</span>
      </button>
    );
  }

  return (
    <aside className={`chat-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      {collapsed ? (
        <button
          className="chat-rail-button"
          type="button"
          aria-label="Open chat"
          onClick={() => persistCollapsed(false)}
        >
          <MessageCircle size={20} aria-hidden="true" />
          <span>Chat</span>
        </button>
      ) : (
        <>
          <div className="chat-status-row">
            <span className="chat-online-dot" aria-hidden="true" />
            <span>Community online</span>
          </div>
          <ChatFrame
            state={state}
            embedUrl={embedUrl}
            message={message}
            readOnly={!isAuthenticated}
          />
          {isAuthenticated && reportEnabled && (
            <>
              <button
                className="chat-report-toggle"
                type="button"
                onClick={() => setReportOpen((open) => !open)}
              >
                <Flag size={15} aria-hidden="true" />
                Report message
              </button>
              {reportOpen && (
                <ChatReportForm
                  roomId={roomId}
                  onClose={() => setReportOpen(false)}
                />
              )}
            </>
          )}
        </>
      )}
    </aside>
  );
}

function ChatReportForm({
  roomId,
  onClose,
}: {
  roomId: string;
  onClose: () => void;
}) {
  const [messageId, setMessageId] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!messageId.trim() || !reason.trim()) return;
    setStatus("saving");
    try {
      await reportChatMessage({
        roomId,
        messageId: messageId.trim(),
        reason: reason.trim(),
      });
      setStatus("saved");
      setMessageId("");
      setReason("");
    } catch (err) {
      logger.warn("Chat", "chat report failed", err);
      setStatus("error");
    }
  };

  return (
    <form className="chat-report-form" onSubmit={submit}>
      <div className="chat-report-row">
        <label htmlFor="chat-report-message">Message ID or link</label>
        <button type="button" onClick={onClose} aria-label="Close report form">
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <input
        id="chat-report-message"
        value={messageId}
        onChange={(event) => setMessageId(event.target.value)}
        autoComplete="off"
        maxLength={255}
      />
      <label htmlFor="chat-report-reason">Reason</label>
      <textarea
        id="chat-report-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={1000}
        rows={3}
      />
      <button
        className="chat-report-submit"
        type="submit"
        disabled={status === "saving" || !messageId.trim() || !reason.trim()}
      >
        {status === "saving" ? "Submitting..." : "Submit report"}
      </button>
      {status === "saved" && (
        <div className="chat-report-status">Report submitted</div>
      )}
      {status === "error" && (
        <div className="chat-report-status is-error">Report unavailable</div>
      )}
    </form>
  );
}

function ChatFrame({
  state,
  embedUrl,
  message,
  readOnly,
}: {
  state: LoadState;
  embedUrl: string;
  message: string;
  readOnly: boolean;
}) {
  const [timedOut, setTimedOut] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimedOut(false);
    setLoaded(false);
    if (state !== "ready") return;
    const timeout = window.setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [embedUrl, state]);

  if (state === "loading" || state === "idle") {
    return <div className="chat-state">Loading chat...</div>;
  }

  if (state === "unavailable" || !embedUrl || (timedOut && !loaded)) {
    return (
      <div className="chat-state">
        <button
          className="chat-dismiss"
          type="button"
          aria-label="Dismiss chat error"
          onClick={() => setTimedOut(false)}
        >
          <X size={16} aria-hidden="true" />
        </button>
        {message || "Chat unavailable"}
      </div>
    );
  }

  return (
    <div className="chat-frame-wrap">
      <iframe
        className="chat-frame"
        title="Hula Na community chat"
        src={embedUrl}
        onLoad={() => setLoaded(true)}
        sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
      />
      {readOnly && (
        <a className="chat-readonly-composer" href="/auth/login">
          Login to chat
        </a>
      )}
    </div>
  );
}
