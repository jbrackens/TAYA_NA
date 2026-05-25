"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  Flag,
  MessageCircle,
  X,
} from "lucide-react";
import { FEATURE_CHAT } from "../../lib/features";
import {
  reportChatMessage,
} from "../../lib/api/chat-client";
import { useAuth } from "../../hooks/useAuth";
import { logger } from "../../lib/logger";

const STORAGE_KEY = "hula_chat_collapsed";
const DEFAULT_ROOM_ID = "general";

type LoadState = "idle" | "loading" | "ready" | "unavailable";
type ChatMessage = {
  username: string;
  timestamp: string;
  content: string;
};

const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    username: "marketmaker23",
    timestamp: "now",
    content: "BTC above $100K just ticked to 63c. Feels like the book is pricing in a soft CPI print.",
  },
  {
    username: "linewatcher",
    timestamp: "1m",
    content: "I grabbed NO on Lakers finals at 41c. Schedule spot looks brutal if Denver closes tonight.",
  },
  {
    username: "island_alpha",
    timestamp: "3m",
    content: "Barcelona CL market moved after the injury update. YES at 14c is finally interesting.",
  },
  {
    username: "oddswatcher",
    timestamp: "4m",
    content: "Solana Q2 just ticked up again. NO side has real liquidity now instead of dust.",
  },
  {
    username: "macro_mina",
    timestamp: "6m",
    content: "Fed cut by September is stuck around 48c. Waiting for payrolls before adding.",
  },
  {
    username: "propdesk",
    timestamp: "7m",
    content: "Someone swept the YES side on oil above $90. Either headline risk or a very confident punt.",
  },
  {
    username: "chalk_eater",
    timestamp: "9m",
    content: "Election turnout market is moving faster than the polls. Watch the county-level updates.",
  },
  {
    username: "arb_hunter",
    timestamp: "11m",
    content: "NBA MVP spread is wider here than on the other venue. Not huge, but worth tracking.",
  },
  {
    username: "quant_kai",
    timestamp: "13m",
    content: "If ETH ETF approval stays above 70c into close, I expect weekend liquidity to get weird.",
  },
  {
    username: "sportsbook_sam",
    timestamp: "15m",
    content: "Weather delay could matter for the grand prix market. Rain probability jumped again.",
  },
  {
    username: "creator_lani",
    timestamp: "18m",
    content: "New market idea: will the first debate get over 50M viewers? Resolution source feels clean.",
  },
  {
    username: "vol_trader",
    timestamp: "21m",
    content: "The Metacritic market is quiet, but one review batch could move it 20 points.",
  },
  {
    username: "risk_check",
    timestamp: "24m",
    content: "Reminder to size positions like they can go to zero. These thin markets can gap hard.",
  },
  {
    username: "mod_malia",
    timestamp: "27m",
    content: "Keep it to market discussion. No personal attacks, no phishing links, no fake screenshots.",
  },
];

export function ChatSidebar() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isDesktop, setIsDesktop] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [state, setState] = useState<LoadState>("idle");
  const [roomId, setRoomId] = useState(DEFAULT_ROOM_ID);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES);
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

  useEffect(() => {
    const shouldPrepareChat = isDesktop ? !collapsed : mobileOpen;
    if (!FEATURE_CHAT || !shouldPrepareChat || isLoading) return;
    setRoomId(DEFAULT_ROOM_ID);
    setMessage("");
    setReportEnabled(isAuthenticated);
    setState("ready");
  }, [collapsed, isAuthenticated, isDesktop, isLoading, mobileOpen]);

  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  const handleSendMessage = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || !isAuthenticated) return;
    setMessages((current) => [
      {
        username: user?.username || "you",
        timestamp: "now",
        content: trimmed,
      },
      ...current,
    ]);
  };

  if (!FEATURE_CHAT) return null;

  const renderChatPanel = (showStatus = true) => (
    <>
      {showStatus && (
        <div className="chat-status-row">
          <span className="chat-online-dot" aria-hidden="true" />
          <span>Community online</span>
        </div>
      )}
      <ChatFrame
        state={state}
        message={message}
        messages={messages}
        readOnly={!isAuthenticated}
        onSend={handleSendMessage}
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
  );

  if (!isDesktop) {
    return (
      <>
        {!mobileOpen && (
          <button
            className="chat-mobile-button"
            type="button"
            aria-label="Open chat"
            onClick={() => setMobileOpen(true)}
          >
            <MessageCircle size={20} aria-hidden="true" />
            <span>Chat</span>
          </button>
        )}
        {mobileOpen && (
          <div className="chat-mobile-overlay">
            <section
              className="chat-mobile-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Community chat"
            >
              <div className="chat-mobile-header">
                <div className="chat-mobile-title">
                  <span className="chat-online-dot" aria-hidden="true" />
                  <span>Community chat</span>
                </div>
                <button
                  className="chat-mobile-close"
                  type="button"
                  aria-label="Close chat"
                  onClick={() => setMobileOpen(false)}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              {renderChatPanel(false)}
            </section>
          </div>
        )}
      </>
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
        renderChatPanel()
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
  message,
  messages,
  readOnly,
  onSend,
}: {
  state: LoadState;
  message: string;
  messages: ChatMessage[];
  readOnly: boolean;
  onSend: (message: string) => void;
}) {
  if (state === "loading" || state === "idle") {
    return <div className="chat-state">Loading chat...</div>;
  }

  if (state === "unavailable") {
    return (
      <div className="chat-state">
        {message || "Chat unavailable"}
      </div>
    );
  }

  return <NativeChatStream messages={messages} readOnly={readOnly} onSend={onSend} />;
}

function NativeChatStream({
  messages,
  readOnly,
  onSend,
}: {
  messages: ChatMessage[];
  readOnly: boolean;
  onSend: (message: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly || !draft.trim()) return;
    onSend(draft);
    setDraft("");
  };

  return (
    <div className="chat-public-stream" aria-label="Community chat">
      <div className="chat-message-list">
        {messages.map((chatMessage) => (
          <article
            className="chat-message"
            key={`${chatMessage.username}-${chatMessage.timestamp}-${chatMessage.content}`}
          >
            <div className="chat-message-meta">
              <span className="chat-message-user">{chatMessage.username}</span>
              <time>{chatMessage.timestamp}</time>
            </div>
            <p>{chatMessage.content}</p>
          </article>
        ))}
      </div>
      {readOnly ? (
        <a className="chat-readonly-composer" href="/auth/login">
          Login to chat
        </a>
      ) : (
        <form className="chat-composer" onSubmit={submit}>
          <input
            aria-label="Chat message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message community"
            maxLength={500}
          />
          <button type="submit" disabled={!draft.trim()}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}
