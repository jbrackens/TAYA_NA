"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  createMarketComment,
  followSocialUser,
  getMarketComments,
  reactToMarketComment,
  reportMarketComment,
  type MarketComment,
} from "../../lib/api/market-social-client";
import { logger } from "../../lib/logger";

const SECTION_CLASS =
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-7 py-6 font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif] max-[1100px]:order-5";
const HEAD_CLASS = "mb-4 flex items-baseline justify-between gap-3";
const TITLE_CLASS =
  "m-0 text-base font-semibold tracking-[-0.01em] text-[var(--t1)]";
const COUNT_CLASS = "text-xs text-[var(--t3)]";
const HEAD_LINK_CLASS =
  "text-xs text-[var(--t2)] underline-offset-4 hover:text-[var(--t1)] hover:underline";
const FORM_CLASS = "mb-5 flex flex-col gap-3";
const TEXTAREA_CLASS =
  "min-h-[92px] resize-y rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2.5 text-sm leading-[1.5] text-[var(--t1)] outline-none placeholder:text-[var(--t3)] focus:border-[var(--accent)]";
const FORM_ROW_CLASS = "flex items-center justify-between gap-3";
const STATUS_CLASS = "text-xs text-[var(--t3)]";
const BUTTON_CLASS =
  "inline-flex min-h-9 items-center justify-center rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 text-xs font-bold text-[var(--t1)] transition-colors hover:border-[var(--border-2)] hover:bg-[var(--action-soft)] disabled:cursor-not-allowed disabled:opacity-55";
// P10 ink action: mint is never a CTA fill (Signal Ink rule).
const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-9 items-center justify-center rounded-[var(--r-rh-md)] border-0 bg-[var(--action)] px-4 text-xs font-bold text-(--action-fg) transition-colors hover:bg-[var(--action-hover)] disabled:cursor-not-allowed disabled:opacity-55";
const LIST_CLASS = "flex flex-col gap-3";
const COMMENT_CLASS =
  "border-t border-[var(--border-1)] pt-3 first:border-t-0 first:pt-0";
const REPLY_CLASS = `${COMMENT_CLASS} ml-5 border-l border-l-[var(--border-1)] pl-4`;
const META_CLASS =
  "mb-1 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.06em] text-[var(--t3)]";
const BODY_CLASS =
  "m-0 whitespace-pre-wrap text-sm leading-[1.55] text-[var(--t1)]";
const ACTIONS_CLASS = "mt-2 flex flex-wrap items-center gap-2";
const EMPTY_CLASS = "py-6 text-center text-sm text-[var(--t3)]";

interface MarketDiscussionProps {
  marketId: string;
  isAuthenticated: boolean;
  authLoading: boolean;
}

export default function MarketDiscussion({
  marketId,
  isAuthenticated,
  authLoading,
}: MarketDiscussionProps) {
  const { t } = useTranslation("prediction");
  const [comments, setComments] = useState<MarketComment[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Load failure is its own state (P10): the old code funneled it into
  // `message`, so an errored section simultaneously showed the composer,
  // "0 comments", "No comments yet.", AND "Discussion could not load." —
  // three states at once. Errored now replaces the body with a retry.
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setComments(await getMarketComments(marketId, 50));
      setMessage(null);
      setLoadError(false);
    } catch (err) {
      logger.warn("MarketDiscussion", "comments fetch failed", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  // The comments endpoint requires a session (P10 QA: anonymous fetches
  // produced 401 → token-refresh 400 console noise on every public
  // market page). Anonymous visitors get an honest sign-in state
  // instead of a doomed request. Backend follow-up filed: make comment
  // READS public so discussion is visible pre-signup.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      setLoadError(false);
      return;
    }
    void load();
  }, [load, isAuthenticated, authLoading]);

  async function submitComment() {
    if (!isAuthenticated || authLoading || saving) return;
    const trimmed = body.trim();
    if (trimmed.length < 2) return;
    setSaving(true);
    try {
      const created = await createMarketComment(
        marketId,
        trimmed,
        replyTo ?? undefined,
      );
      setComments((prev) => [created, ...prev]);
      setBody("");
      setReplyTo(null);
      setMessage(t("DISCUSSION_POSTED", "Posted."));
    } catch (err) {
      logger.warn("MarketDiscussion", "comment create failed", err);
      setMessage(t("DISCUSSION_POST_FAILED", "Comment could not be posted."));
    } finally {
      setSaving(false);
    }
  }

  async function updateComment(
    commentId: string,
    updater: (id: string) => Promise<MarketComment>,
  ) {
    if (!isAuthenticated || authLoading) return;
    try {
      const updated = await updater(commentId);
      setComments((prev) =>
        prev.map((comment) => (comment.id === updated.id ? updated : comment)),
      );
    } catch (err) {
      logger.warn("MarketDiscussion", "comment update failed", err);
      setMessage(
        t("DISCUSSION_UPDATE_FAILED", "Action could not be recorded."),
      );
    }
  }

  async function followUser(userId: string) {
    if (!isAuthenticated || authLoading) return;
    try {
      const profile = await followSocialUser(userId);
      setMessage(
        t("DISCUSSION_FOLLOWED", "Following {{user}}.", {
          user: profile.displayName || profile.userId,
        }),
      );
    } catch (err) {
      logger.warn("MarketDiscussion", "follow failed", err);
      setMessage(
        t("DISCUSSION_FOLLOW_FAILED", "Follow could not be recorded."),
      );
    }
  }

  const composerHint = !isAuthenticated
    ? t("DISCUSSION_SIGN_IN", "Sign in to join the market discussion.")
    : replyTo
      ? t("DISCUSSION_REPLYING", "Replying to a comment.")
      : t(
          "DISCUSSION_HINT",
          "Share resolution sources, reasoning, or market context.",
        );

  return (
    <section
      className={SECTION_CLASS}
      aria-labelledby="market-discussion-title"
    >
      <header className={HEAD_CLASS}>
        <h3 id="market-discussion-title" className={TITLE_CLASS}>
          {t("DISCUSSION_TITLE", "Discussion")}
        </h3>
        <div className="flex items-center gap-3">
          <Link href="/activity" className={HEAD_LINK_CLASS}>
            {t("DISCUSSION_ACTIVITY", "Activity feed")}
          </Link>
          <span className={COUNT_CLASS}>
            {loadError
              ? "—"
              : t("DISCUSSION_COUNT", "{{count}} comments", {
                  count: comments.length,
                })}
          </span>
        </div>
      </header>

      {!isAuthenticated && !authLoading ? (
        <div className={EMPTY_CLASS}>
          <p className="m-0 mb-3">
            {t(
              "DISCUSSION_SIGN_IN_TO_VIEW",
              "Sign in to read and join the market discussion.",
            )}
          </p>
          <Link href="/auth/login" className={BUTTON_CLASS}>
            {t("DISCUSSION_SIGN_IN_CTA", "Sign in")}
          </Link>
        </div>
      ) : loadError && !loading ? (
        <div className={EMPTY_CLASS} role="status">
          <p className="m-0 mb-3">
            {t("DISCUSSION_LOAD_FAILED", "Discussion could not load.")}
          </p>
          <button type="button" className={BUTTON_CLASS} onClick={load}>
            {t("RETRY", "Retry")}
          </button>
        </div>
      ) : (
        <>
          <div className={FORM_CLASS}>
            <textarea
              className={TEXTAREA_CLASS}
              value={body}
              maxLength={500}
              disabled={!isAuthenticated || authLoading || saving}
              placeholder={composerHint}
              onChange={(event) => setBody(event.target.value)}
            />
            <div className={FORM_ROW_CLASS}>
              <span className={STATUS_CLASS}>{message ?? composerHint}</span>
              <button
                type="button"
                className={PRIMARY_BUTTON_CLASS}
                disabled={
                  !isAuthenticated ||
                  authLoading ||
                  saving ||
                  body.trim().length < 2
                }
                onClick={submitComment}
              >
                {saving
                  ? t("DISCUSSION_POSTING", "Posting")
                  : replyTo
                    ? t("DISCUSSION_REPLY", "Reply")
                    : t("DISCUSSION_POST", "Post")}
              </button>
            </div>
          </div>

          {loading ? (
            <div className={EMPTY_CLASS}>
              {t("DISCUSSION_LOADING", "Loading discussion.")}
            </div>
          ) : comments.length === 0 ? (
            <div className={EMPTY_CLASS}>
              {t("DISCUSSION_EMPTY", "No comments yet.")}
            </div>
          ) : (
            <div className={LIST_CLASS}>
              {comments.map((comment) => (
                <article
                  key={comment.id}
                  className={comment.parentId ? REPLY_CLASS : COMMENT_CLASS}
                >
                  <div className={META_CLASS}>
                    <Link
                      href={`/users/${encodeURIComponent(comment.userId)}`}
                      className={HEAD_LINK_CLASS}
                    >
                      {comment.userId}
                    </Link>
                    <span>{formatDate(comment.createdAt)}</span>
                    {comment.parentId && (
                      <span>{t("DISCUSSION_REPLY_TAG", "Reply")}</span>
                    )}
                  </div>
                  <p className={BODY_CLASS}>{comment.body}</p>
                  <div className={ACTIONS_CLASS}>
                    <button
                      type="button"
                      className={BUTTON_CLASS}
                      disabled={!isAuthenticated || authLoading}
                      onClick={() =>
                        updateComment(comment.id, reactToMarketComment)
                      }
                    >
                      {t("DISCUSSION_REACT", "Upvote")} ·{" "}
                      {comment.reactionCount}
                    </button>
                    <button
                      type="button"
                      className={BUTTON_CLASS}
                      disabled={!isAuthenticated || authLoading}
                      onClick={() => followUser(comment.userId)}
                    >
                      {t("DISCUSSION_FOLLOW", "Follow")}
                    </button>
                    <button
                      type="button"
                      className={BUTTON_CLASS}
                      disabled={!isAuthenticated || authLoading}
                      onClick={() => setReplyTo(comment.id)}
                    >
                      {t("DISCUSSION_REPLY", "Reply")}
                    </button>
                    <button
                      type="button"
                      className={BUTTON_CLASS}
                      disabled={!isAuthenticated || authLoading}
                      onClick={() =>
                        updateComment(comment.id, (id) =>
                          reportMarketComment(id, "user_report"),
                        )
                      }
                    >
                      {t("DISCUSSION_REPORT", "Report")} · {comment.reportCount}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
