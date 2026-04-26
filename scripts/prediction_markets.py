"""
Unified prediction-market metadata fetcher for demo seeding.

Pulls active markets from three free, no-auth sources:
  - Polymarket (Gamma API)         https://gamma-api.polymarket.com
  - Kalshi (public read endpoints) https://api.elections.kalshi.com/trade-api/v2
  - Manifold (v0 API)              https://api.manifold.markets/v0

Normalizes into one shape, dedupes by fuzzy title similarity across sources,
and prints JSON to stdout (or writes to --out).

All three endpoints are rate-limited but require no API key. Suitable for a
demo. For production, add API keys and switch to the paid tiers.

Usage:
    python prediction_markets.py                        # 50 markets, JSON to stdout
    python prediction_markets.py --limit 200            # 200 markets total
    python prediction_markets.py --out markets.json     # write to file
    python prediction_markets.py --sources polymarket,kalshi  # restrict sources
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass, field
from difflib import SequenceMatcher
from typing import Any


# ---------- Unified shape ----------


@dataclass
class Market:
    """One prediction-market record, normalized across venues."""

    id: str                          # "{source}:{native_id}"
    source: str                      # "polymarket" | "kalshi" | "manifold"
    title: str
    description: str | None
    image_url: str | None
    category: str | None
    end_time: str | None             # ISO8601 string when the market closes
    volume: float | None             # in source's native currency (USD-ish)
    liquidity: float | None
    outcomes: list[str] = field(default_factory=list)   # e.g. ["Yes", "No"]
    prices: list[float] = field(default_factory=list)   # 0..1, parallel to outcomes
    url: str | None = None
    raw: dict[str, Any] | None = None  # original payload, kept for debugging


# ---------- HTTP helper ----------


def _get(url: str, *, timeout: int = 15, headers: dict | None = None) -> Any:
    h = {"User-Agent": "demo-pm-seeder/0.1", "Accept": "application/json"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", errors="ignore"))


# ---------- Polymarket Gamma ----------


def fetch_polymarket(limit: int = 100) -> list[Market]:
    """Polymarket Gamma is fully public. Pull active, non-closed markets."""
    out: list[Market] = []
    offset = 0
    page = 500
    while len(out) < limit:
        url = (
            "https://gamma-api.polymarket.com/markets"
            f"?active=true&closed=false&limit={page}&offset={offset}"
        )
        data = _get(url)
        if not isinstance(data, list) or not data:
            break
        for m in data:
            try:
                outcomes = json.loads(m.get("outcomes") or "[]")
                prices_raw = json.loads(m.get("outcomePrices") or "[]")
                prices = [float(p) for p in prices_raw]
            except Exception:
                outcomes, prices = [], []
            slug = m.get("slug")
            event_slug = m.get("groupSlug") or m.get("eventSlug")
            url_path = f"/event/{event_slug}" if event_slug else f"/market/{slug}"
            out.append(
                Market(
                    id=f"polymarket:{m.get('id')}",
                    source="polymarket",
                    title=m.get("question") or "",
                    description=m.get("description"),
                    image_url=m.get("image") or m.get("icon"),
                    category=(m.get("category") or None),
                    end_time=m.get("endDate"),
                    volume=_to_float(m.get("volume")),
                    liquidity=_to_float(m.get("liquidity")),
                    outcomes=outcomes,
                    prices=prices,
                    url=f"https://polymarket.com{url_path}",
                    raw=m,
                )
            )
            if len(out) >= limit:
                break
        if len(data) < page:
            break
        offset += page
    return out


# ---------- Kalshi public ----------


def fetch_kalshi(limit: int = 100) -> list[Market]:
    """Kalshi public read endpoint.

    Kalshi's open-market list is dominated by auto-generated MVE (multivariate
    event) parlay markets that are useless for a demo grid — titles read like
    "yes CJ McCollum: 15+, yes Jalen Brunson: 20+". We filter those out by
    skipping rows that have ``mve_selected_legs`` set or that ride on the
    ``KXMVE...`` event prefix.
    """
    out: list[Market] = []
    cursor: str | None = None
    # Pull more than `limit` because we expect ~half to be filtered out.
    while len(out) < limit:
        # Kalshi caps page size at 1000.
        params = {"status": "open", "limit": "1000"}
        if cursor:
            params["cursor"] = cursor
        url = (
            "https://api.elections.kalshi.com/trade-api/v2/markets?"
            + urllib.parse.urlencode(params)
        )
        data = _get(url)
        markets = data.get("markets") or []
        if not markets:
            break
        for m in markets:
            # Skip MVE / parlay-style markets — bad demo content.
            if m.get("mve_selected_legs"):
                continue
            if (m.get("event_ticker") or "").startswith("KXMVE"):
                continue
            # Kalshi prices in this endpoint are *_dollars strings ("0.4500"),
            # already on a 0..1 scale — no /100 needed.
            yes_p = _to_float(m.get("yes_bid_dollars"))
            no_p = _to_float(m.get("no_bid_dollars"))
            prices = [p for p in (yes_p, no_p) if p is not None]
            # Markets don't carry their own description/category — those live on
            # the parent event. For demo seeding, fall back to the yes/no leg
            # subtitles, which usually read like "Boston Red Sox" or
            # "Above 2.5 goals" and are good card copy.
            sub = m.get("yes_sub_title") or m.get("no_sub_title") or ""
            description = m.get("rules_primary") or sub or None
            out.append(
                Market(
                    id=f"kalshi:{m.get('ticker')}",
                    source="kalshi",
                    title=m.get("title") or sub or "",
                    description=description,
                    image_url=None,  # event-level only; hydrate via /events if needed
                    category=None,   # event-level only
                    end_time=m.get("close_time"),
                    volume=_to_float(m.get("volume_fp") or m.get("volume_24h_fp")),
                    liquidity=_to_float(m.get("liquidity_dollars")),
                    outcomes=["Yes", "No"],
                    prices=prices,
                    url=f"https://kalshi.com/markets/{m.get('event_ticker')}/{m.get('ticker')}",
                    raw=m,
                )
            )
            if len(out) >= limit:
                break
        cursor = data.get("cursor")
        if not cursor:
            break
    return out


# ---------- Manifold ----------


def fetch_manifold(limit: int = 100) -> list[Market]:
    """Manifold v0 — community markets, fully open, lots of variety."""
    out: list[Market] = []
    before: str | None = None
    while len(out) < limit:
        url = (
            "https://api.manifold.markets/v0/markets"
            f"?limit={min(1000, limit - len(out))}"
        )
        if before:
            url += f"&before={before}"
        data = _get(url)
        if not data:
            break
        for m in data:
            if m.get("isResolved"):
                continue
            prob = m.get("probability")
            outcomes = ["Yes", "No"] if m.get("outcomeType") == "BINARY" else []
            prices = [prob, 1 - prob] if isinstance(prob, (int, float)) and outcomes else []
            out.append(
                Market(
                    id=f"manifold:{m.get('id')}",
                    source="manifold",
                    title=m.get("question") or "",
                    description=m.get("textDescription") or None,
                    image_url=m.get("coverImageUrl"),
                    category=None,  # Manifold uses "groupSlugs"; not in v0 list payload
                    end_time=_iso_from_ms(m.get("closeTime")),
                    volume=_to_float(m.get("volume")),
                    liquidity=_to_float(m.get("totalLiquidity")),
                    outcomes=outcomes,
                    prices=prices,
                    url=m.get("url"),
                    raw=m,
                )
            )
            if len(out) >= limit:
                break
        if len(data) < 1000:
            break
        before = data[-1].get("id")
    return out


# ---------- Helpers ----------


def _to_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _iso_from_ms(ms: Any) -> str | None:
    if not isinstance(ms, (int, float)):
        return None
    from datetime import datetime, timezone

    return datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc).isoformat()


# ---------- Dedup ----------


_PUNCT = re.compile(r"[^a-z0-9 ]+")
_WS = re.compile(r"\s+")


def _norm(s: str) -> str:
    s = s.lower()
    s = _PUNCT.sub(" ", s)
    s = _WS.sub(" ", s).strip()
    return s


def dedupe(markets: list[Market], threshold: float = 0.85) -> list[Market]:
    """Drop near-duplicate markets across sources by fuzzy title similarity.

    Preference order when collapsing a duplicate group:
      polymarket > kalshi > manifold
    (whichever has the richest metadata for cards goes first.)
    """
    pref = {"polymarket": 0, "kalshi": 1, "manifold": 2}
    sorted_markets = sorted(markets, key=lambda m: (pref.get(m.source, 99), -(m.volume or 0)))
    kept: list[Market] = []
    kept_norms: list[str] = []
    for m in sorted_markets:
        n = _norm(m.title)
        if not n:
            continue
        is_dup = False
        for kn in kept_norms:
            if SequenceMatcher(None, n, kn).ratio() >= threshold:
                is_dup = True
                break
        if not is_dup:
            kept.append(m)
            kept_norms.append(n)
    return kept


# ---------- CLI ----------


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Fetch unified prediction-market metadata for demo seeding.")
    p.add_argument("--sources", default="polymarket,kalshi,manifold",
                   help="Comma-separated subset of: polymarket,kalshi,manifold")
    p.add_argument("--limit", type=int, default=50,
                   help="Max markets per source")
    p.add_argument("--dedupe-threshold", type=float, default=0.85,
                   help="Title-similarity threshold (0..1) for cross-source dedupe")
    p.add_argument("--no-dedupe", action="store_true")
    p.add_argument("--no-raw", action="store_true",
                   help="Drop the original 'raw' payload from output")
    p.add_argument("--out", default=None, help="Write JSON here instead of stdout")
    args = p.parse_args(argv)

    fetchers = {
        "polymarket": fetch_polymarket,
        "kalshi": fetch_kalshi,
        "manifold": fetch_manifold,
    }
    sources = [s.strip() for s in args.sources.split(",") if s.strip()]

    all_markets: list[Market] = []
    for s in sources:
        if s not in fetchers:
            print(f"warn: unknown source {s!r}, skipping", file=sys.stderr)
            continue
        t0 = time.time()
        try:
            ms = fetchers[s](limit=args.limit)
            print(f"{s}: pulled {len(ms)} markets in {time.time()-t0:.1f}s", file=sys.stderr)
            all_markets.extend(ms)
        except Exception as e:
            print(f"{s}: ERROR {e}", file=sys.stderr)

    if not args.no_dedupe:
        before = len(all_markets)
        all_markets = dedupe(all_markets, threshold=args.dedupe_threshold)
        print(f"dedupe: {before} -> {len(all_markets)}", file=sys.stderr)

    payload = [asdict(m) for m in all_markets]
    if args.no_raw:
        for row in payload:
            row.pop("raw", None)

    text = json.dumps(payload, indent=2, default=str)
    if args.out:
        with open(args.out, "w") as f:
            f.write(text)
        print(f"wrote {args.out}", file=sys.stderr)
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
