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

const chatClasses = {
  statusRow:
    "flex min-h-[38px] items-center gap-2 border-b border-[var(--border-1)] bg-[var(--surface-2)] px-2.5 text-[11px] font-bold text-[var(--t3)]",
  onlineDot:
    "h-1.5 w-1.5 shrink-0 rounded-full bg-[#20d878] shadow-[0_0_10px_rgba(32,216,120,0.55)]",
  reportToggle:
    "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 border-0 border-t border-[var(--border-1)] bg-[var(--surface-1)] text-xs font-bold text-[var(--t2)]",
  mobileButton:
    "fixed right-[18px] bottom-[calc(92px+env(safe-area-inset-bottom))] z-[95] inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--r-pill)] border-0 bg-[var(--accent)] px-3.5 text-[13px] font-bold text-[#061a10] shadow-[0_10px_28px_rgba(60,50,30,0.18)]",
  mobileOverlay:
    "fixed inset-0 z-[120] flex items-end justify-stretch bg-[rgba(18,16,12,0.28)] px-2.5 pt-0 pb-[max(10px,env(safe-area-inset-bottom))]",
  mobileSheet:
    "chat-mobile-sheet flex h-[min(78vh,680px)] min-h-[420px] w-full flex-col overflow-hidden rounded-2xl border border-[var(--border-1)] bg-[var(--surface-2)] shadow-[0_18px_48px_rgba(40,35,22,0.24)]",
  mobileHeader:
    "flex min-h-12 items-center justify-between gap-3 border-b border-[var(--border-1)] bg-[var(--surface-1)] py-0 pr-3 pl-3.5",
  mobileTitle:
    "flex min-w-0 items-center gap-2 text-[13px] font-extrabold text-[var(--t1)]",
  mobileClose:
    "grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-[var(--r-rh-sm)] border-0 bg-[var(--surface-2)] text-[var(--t2)]",
  sidebarBase:
    "sticky top-[66px] left-0 z-[70] flex h-[calc(100vh-66px)] flex-col overflow-hidden border-x border-[var(--border-1)] bg-[var(--surface-2)] shadow-none",
  sidebarOpen: "w-[260px] min-w-[260px]",
  sidebarCollapsed: "w-[52px] min-w-[52px]",
  railButton:
    "inline-flex h-full w-full cursor-pointer flex-col items-center justify-start gap-2 border-0 border-r border-[var(--border-1)] bg-[var(--surface-1)] pt-3.5 text-xs font-extrabold text-[var(--t2)]",
  railIcon:
    "h-7 w-7 rounded-lg bg-[var(--accent)] p-1.5 text-[#061a10]",
  reportForm:
    "grid gap-2 border-t border-[var(--border-1)] bg-[var(--surface-2)] p-3",
  reportRow: "flex items-center justify-between gap-2",
  reportClose:
    "grid h-7 w-7 cursor-pointer place-items-center rounded-[var(--r-rh-sm)] border-0 bg-[var(--surface-1)] text-[var(--t3)]",
  reportLabel: "text-[11px] font-bold text-[var(--t2)]",
  reportInput:
    "w-full rounded-[var(--r-rh-sm)] border border-[var(--border-1)] bg-[var(--surface-1)] px-2.5 text-xs text-[var(--t1)] font-[inherit]",
  reportTextArea:
    "min-h-[72px] w-full resize-y rounded-[var(--r-rh-sm)] border border-[var(--border-1)] bg-[var(--surface-1)] px-2.5 py-2 text-xs text-[var(--t1)] font-[inherit]",
  reportSubmit:
    "min-h-9 cursor-pointer rounded-[var(--r-rh-md)] border-0 bg-[var(--accent)] text-xs font-extrabold text-[#061a10] disabled:cursor-not-allowed disabled:opacity-55",
  reportStatus: "text-xs font-bold text-[var(--t2)]",
  reportError: "text-[#b3261e]",
  state:
    "relative grid flex-1 place-items-center bg-[var(--surface-1)] p-3.5 text-center text-xs font-bold text-[var(--t3)]",
  stream:
    "relative flex min-h-0 flex-1 flex-col bg-[var(--surface-2)]",
  messageList:
    "flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 pt-3 pb-[62px]",
  message:
    "rounded-[var(--r-rh-sm)] border border-[var(--border-1)] bg-[var(--surface-1)] p-2.5",
  messageMeta:
    "flex items-center justify-between gap-2 text-[10px] font-bold text-[var(--t3)]",
  messageUser:
    "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[var(--t2)]",
  messageText: "mt-[5px] mb-0 text-xs font-[650] leading-[1.35] text-[var(--t1)]",
  readonlyComposer:
    "absolute right-2.5 bottom-3 left-2.5 flex min-h-[34px] items-center rounded-[7px] border border-[var(--border-1)] bg-[var(--surface-2)] px-2.5 text-left text-xs font-extrabold text-[var(--t3)] shadow-[0_8px_20px_rgba(48,42,28,0.08)]",
  composer:
    "absolute right-2.5 bottom-3 left-2.5 grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] p-1.5 shadow-[0_8px_20px_rgba(48,42,28,0.08)]",
  composerInput:
    "h-8 min-w-0 border-0 bg-transparent text-xs font-bold text-[var(--t1)] outline-none placeholder:text-[var(--t3)]",
  composerButton:
    "h-8 rounded-[var(--r-pill)] border-0 bg-[var(--accent)] px-3 text-xs font-[850] text-[#061a10] disabled:cursor-not-allowed disabled:opacity-45",
};

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
        <div className={chatClasses.statusRow}>
          <span className={chatClasses.onlineDot} aria-hidden="true" />
          <span>Online</span>
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
            className={chatClasses.reportToggle}
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
            className={chatClasses.mobileButton}
            type="button"
            aria-label="Open chat"
            onClick={() => setMobileOpen(true)}
          >
            <MessageCircle size={20} aria-hidden="true" />
            <span>Chat</span>
          </button>
        )}
        {mobileOpen && (
          <div className={chatClasses.mobileOverlay}>
            <section
              className={chatClasses.mobileSheet}
              role="dialog"
              aria-modal="true"
              aria-label="Community chat"
            >
              <div className={chatClasses.mobileHeader}>
                <div className={chatClasses.mobileTitle}>
                  <span className={chatClasses.onlineDot} aria-hidden="true" />
                  <span>Community chat</span>
                </div>
                <button
                  className={chatClasses.mobileClose}
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
    <aside
      className={`${chatClasses.sidebarBase} ${
        collapsed ? chatClasses.sidebarCollapsed : chatClasses.sidebarOpen
      }`}
    >
      {collapsed ? (
        <button
          className={chatClasses.railButton}
          type="button"
          aria-label="Open chat"
          onClick={() => persistCollapsed(false)}
        >
          <MessageCircle
            size={20}
            className={chatClasses.railIcon}
            aria-hidden="true"
          />
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
    <form className={chatClasses.reportForm} onSubmit={submit}>
      <div className={chatClasses.reportRow}>
        <label className={chatClasses.reportLabel} htmlFor="chat-report-message">
          Message ID or link
        </label>
        <button
          className={chatClasses.reportClose}
          type="button"
          onClick={onClose}
          aria-label="Close report form"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <input
        id="chat-report-message"
        className={`${chatClasses.reportInput} h-[34px]`}
        value={messageId}
        onChange={(event) => setMessageId(event.target.value)}
        autoComplete="off"
        maxLength={255}
      />
      <label className={chatClasses.reportLabel} htmlFor="chat-report-reason">
        Reason
      </label>
      <textarea
        id="chat-report-reason"
        className={chatClasses.reportTextArea}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={1000}
        rows={3}
      />
      <button
        className={chatClasses.reportSubmit}
        type="submit"
        disabled={status === "saving" || !messageId.trim() || !reason.trim()}
      >
        {status === "saving" ? "Submitting..." : "Submit report"}
      </button>
      {status === "saved" && (
        <div className={chatClasses.reportStatus}>Report submitted</div>
      )}
      {status === "error" && (
        <div className={`${chatClasses.reportStatus} ${chatClasses.reportError}`}>
          Report unavailable
        </div>
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
    return <div className={chatClasses.state}>Loading chat...</div>;
  }

  if (state === "unavailable") {
    return (
      <div className={chatClasses.state}>
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
    <div className={chatClasses.stream} aria-label="Community chat">
      <div className={chatClasses.messageList}>
        {messages.map((chatMessage) => (
          <article
            className={chatClasses.message}
            key={`${chatMessage.username}-${chatMessage.timestamp}-${chatMessage.content}`}
          >
            <div className={chatClasses.messageMeta}>
              <span className={chatClasses.messageUser}>{chatMessage.username}</span>
              <time>{chatMessage.timestamp}</time>
            </div>
            <p className={chatClasses.messageText}>{chatMessage.content}</p>
          </article>
        ))}
      </div>
      {readOnly ? (
        <a className={chatClasses.readonlyComposer} href="/auth/login">
          Login to chat
        </a>
      ) : (
        <form className={chatClasses.composer} onSubmit={submit}>
          <input
            aria-label="Chat message"
            className={chatClasses.composerInput}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message community"
            maxLength={500}
          />
          <button
            className={chatClasses.composerButton}
            type="submit"
            disabled={!draft.trim()}
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
