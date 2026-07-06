"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import {
  followSocialUser,
  getPublicUserProfile,
  getUserActivity,
  type PublicUserProfile,
  type SocialActivityItem,
} from "../../lib/api/market-social-client";
import { logger } from "../../lib/logger";

const WRAP_CLASS = "mx-auto max-w-[920px] px-4 pb-16 text-[var(--t1)]";
const HEADER_CLASS =
  "mb-5 rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-6";
const BACK_LINK_CLASS =
  "mb-4 inline-flex text-xs text-[var(--t2)] underline-offset-4 hover:text-[var(--accent)] hover:underline";
const TITLE_CLASS = "m-0 text-[28px] font-extrabold tracking-[-0.02em]";
const META_CLASS = "mt-2 flex flex-wrap gap-3 text-sm text-[var(--t2)]";
const BUTTON_CLASS =
  "mt-4 inline-flex min-h-9 items-center justify-center rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 text-xs font-bold text-[var(--t1)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55";
const SECTION_CLASS =
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-6";
const SECTION_TITLE_CLASS = "m-0 mb-3 text-base font-bold";
const LIST_CLASS = "flex flex-col gap-3";
const ITEM_CLASS =
  "border-t border-[var(--border-1)] pt-3 first:border-t-0 first:pt-0";
const ITEM_META_CLASS = "mb-1 text-xs text-[var(--t3)]";
const ITEM_BODY_CLASS = "m-0 text-sm leading-[1.55] text-[var(--t1)]";
const STATE_CLASS = "py-12 text-center text-sm text-[var(--t3)]";

export default function PublicUserPage() {
  const { t } = useTranslation("prediction");
  const params = useParams() ?? {};
  const userId = decodeURIComponent(
    (params.userId as string | undefined) ?? "",
  );
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [activity, setActivity] = useState<SocialActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) return;
      try {
        setLoading(true);
        const [profileResult, activityResult] = await Promise.all([
          getPublicUserProfile(userId),
          getUserActivity(userId, 50),
        ]);
        if (cancelled) return;
        setProfile(profileResult);
        setActivity(activityResult);
      } catch (err) {
        logger.warn("PublicUserPage", "profile load failed", err);
        if (!cancelled)
          setMessage(
            t("SOCIAL_PROFILE_LOAD_FAILED", "Profile could not load."),
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, t]);

  async function follow() {
    if (!userId || !isAuthenticated || authLoading) return;
    try {
      const nextProfile = await followSocialUser(userId);
      setProfile(nextProfile);
      setMessage(t("SOCIAL_FOLLOWED", "Follow recorded."));
    } catch (err) {
      logger.warn("PublicUserPage", "follow failed", err);
      setMessage(t("SOCIAL_FOLLOW_FAILED", "Follow could not be recorded."));
    }
  }

  if (loading) {
    return (
      <div className={STATE_CLASS}>
        {t("SOCIAL_LOADING", "Loading profile.")}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={STATE_CLASS}>
        {message ?? t("SOCIAL_PROFILE_EMPTY", "Profile unavailable.")}
      </div>
    );
  }

  return (
    <main className={WRAP_CLASS}>
      <Link href="/predict" className={BACK_LINK_CLASS}>
        {t("BACK_TO_MARKETS", "Back to markets")}
      </Link>
      <header className={HEADER_CLASS}>
        <h1 className={TITLE_CLASS}>{profile.displayName || profile.userId}</h1>
        <div className={META_CLASS}>
          <span>
            {t("SOCIAL_COMMENTS", "{{count}} comments", {
              count: profile.commentCount,
            })}
          </span>
          <span>
            {t("SOCIAL_FOLLOWERS", "{{count}} followers", {
              count: profile.followerCount,
            })}
          </span>
          <span>
            {t("SOCIAL_FOLLOWING", "{{count}} following", {
              count: profile.followingCount,
            })}
          </span>
        </div>
        <button
          type="button"
          className={BUTTON_CLASS}
          disabled={!isAuthenticated || authLoading || profile.viewerFollowing}
          onClick={follow}
        >
          {profile.viewerFollowing
            ? t("SOCIAL_FOLLOWING_CTA", "Following")
            : t("SOCIAL_FOLLOW_CTA", "Follow")}
        </button>
        {message && <div className={ITEM_META_CLASS}>{message}</div>}
      </header>

      <section className={SECTION_CLASS}>
        <h2 className={SECTION_TITLE_CLASS}>
          {t("SOCIAL_ACTIVITY", "Activity")}
        </h2>
        {activity.length === 0 ? (
          <div className={STATE_CLASS}>
            {t("SOCIAL_NO_ACTIVITY", "No activity yet.")}
          </div>
        ) : (
          <div className={LIST_CLASS}>
            {activity.map((item) => (
              <article key={item.id} className={ITEM_CLASS}>
                <div className={ITEM_META_CLASS}>
                  {formatActivityMeta(item)}
                </div>
                <p className={ITEM_BODY_CLASS}>{activityLabel(item)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function activityLabel(item: SocialActivityItem): string {
  if (item.type === "follow") return `${item.userId} followed ${item.targetId}`;
  if (item.type === "trade") return item.body || `${item.userId} traded`;
  if (item.type === "settlement")
    return item.body || `${item.userId} settled a market`;
  if (item.type === "reward")
    return item.body || `${item.userId} earned reward points`;
  if (item.type === "leaderboard")
    return item.body || `${item.userId} appeared on a leaderboard`;
  return item.body || `${item.userId} commented`;
}

function formatActivityMeta(item: SocialActivityItem): string {
  const d = new Date(item.createdAt);
  const when = Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  return item.marketId
    ? `${item.type} · ${item.marketId} · ${when}`
    : `${item.type} · ${when}`;
}
