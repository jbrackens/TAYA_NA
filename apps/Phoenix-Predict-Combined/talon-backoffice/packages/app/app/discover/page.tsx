"use client";

/**
 * DiscoverPage — secondary discovery surface focused on curated lists
 * the homepage no longer carries: Trending and Closing Soon.
 *
 * The homepage (/predict) now leads with hero + sidebar feed + Featured +
 * full All Markets list. /discover is for users who want to browse the
 * editorially-ranked groupings without scrolling past the hero stack.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionHead } from "../components/prediction/SectionHead";
import { MarketGrid } from "../components/prediction/MarketGrid";
import type { DiscoveryResponse } from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

const ROUTE_LOADING_CLASS = "p-20 text-center text-[13px] text-[var(--t3)]";
const GLASS_SURFACE_CLASS =
  "relative border border-white/[0.13] bg-[color:var(--glass-regular)] bg-[image:linear-gradient(180deg,_rgba(255,255,255,0.14)_0%,_rgba(255,255,255,0.05)_30%,_rgba(255,255,255,0.025)_100%)] shadow-[inset_0_1px_0_var(--rim-top),inset_0_-1px_0_var(--rim-bottom),inset_1px_0_2px_var(--chroma-1),inset_-1px_0_2px_var(--chroma-2),0_2px_6px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.28),0_16px_48px_rgba(0,0,0,0.2)] backdrop-blur-[30px] backdrop-saturate-[180%] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-[inherit] before:bg-[image:linear-gradient(180deg,_rgba(255,255,255,0.06)_0%,_transparent_100%)] before:mix-blend-overlay before:content-['']";
const DISCOVER_STATE_CARD_CLASS = `${GLASS_SURFACE_CLASS} mx-auto my-[60px] max-w-[560px] rounded-[var(--r-lg)] p-14 text-center`;
const DISCOVER_STATE_TITLE_CLASS =
  "m-0 text-[18px] font-bold text-[var(--t1)]";
const DISCOVER_STATE_COPY_CLASS = "mt-2 mb-0 text-[13px] text-[var(--t3)]";
const DISCOVER_INTRO_CLASS = "mt-1 mb-2";
const DISCOVER_EYEBROW_CLASS =
  "mt-0 mb-1.5 font-['IBM_Plex_Mono',_monospace] text-[10px] uppercase tracking-[0.16em] text-[var(--t3)]";
const DISCOVER_TITLE_CLASS =
  "mt-0 mb-2 text-[28px] font-extrabold tracking-[-0.02em] text-[var(--t1)]";
const DISCOVER_SUB_CLASS =
  "m-0 max-w-[640px] text-sm leading-[1.5] text-[var(--t2)]";

export default function DiscoverPage() {
  const { t } = useTranslation("prediction");
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getDiscovery()
      .then((d) => {
        if (!cancelled) setDiscovery(d);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className={ROUTE_LOADING_CLASS}>{t("DISCOVER_LOADING")}</div>;
  }

  if (error) {
    return (
      <div className={DISCOVER_STATE_CARD_CLASS}>
        <h2 className={DISCOVER_STATE_TITLE_CLASS}>
          {t("DISCOVER_LOAD_ERROR_TITLE")}
        </h2>
        <p className={DISCOVER_STATE_COPY_CLASS}>{error}</p>
      </div>
    );
  }

  const trending = discovery?.trending ?? [];
  const closingSoon = discovery?.closingSoon ?? [];

  if (trending.length === 0 && closingSoon.length === 0) {
    return (
      <div className={DISCOVER_STATE_CARD_CLASS}>
        <h2 className={DISCOVER_STATE_TITLE_CLASS}>
          {t("DISCOVER_EMPTY_TITLE")}
        </h2>
        <p className={DISCOVER_STATE_COPY_CLASS}>{t("DISCOVER_EMPTY_COPY")}</p>
      </div>
    );
  }

  return (
    <div>
      <header className={DISCOVER_INTRO_CLASS}>
        <p className={DISCOVER_EYEBROW_CLASS}>{t("DISCOVER_EYEBROW")}</p>
        <h1 className={DISCOVER_TITLE_CLASS}>{t("DISCOVER_TITLE")}</h1>
        <p className={DISCOVER_SUB_CLASS}>{t("DISCOVER_SUBTITLE")}</p>
      </header>

      {trending.length > 0 && (
        <>
          <SectionHead title={t("DISCOVER_TRENDING")} count={trending.length} />
          <MarketGrid markets={trending} />
        </>
      )}

      {closingSoon.length > 0 && (
        <>
          <SectionHead
            title={t("DISCOVER_CLOSING_SOON")}
            count={closingSoon.length}
          />
          <MarketGrid markets={closingSoon} />
        </>
      )}
    </div>
  );
}
