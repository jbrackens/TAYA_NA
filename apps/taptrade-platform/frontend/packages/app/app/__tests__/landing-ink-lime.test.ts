/**
 * Ink & lime step 6 — the landing page (Landing.dc.html 15a-c).
 *
 * Source-level assertions (repo convention — the suite runs node:test,
 * not a DOM harness) pinning the step's contracts:
 *  - ink on lime, never white: every lime fill carries --ticket-cta-text,
 *    and the retired mint/deep-green literals stay gone
 *  - UAT-001: the Yes/No toggles on the market preview cards are the one
 *    interactive element — they flip state, they never navigate
 *  - the drawn hero uses the muted direction tones and carries no
 *    hardcoded price chips
 *  - the ambient video is triple-gated: reduced motion, saveData, and
 *    the lg breakpoint (it's ~1.6MB)
 *  - the trade-ticket mockup is regenerated from the real ticket: neutral
 *    price magnitudes, sign-up CTA (the "Log in to trade" drift is dead),
 *    no saturated direction fills
 *  - the footer wordmark clamps 168px → 54px
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(appRoot, rel), "utf-8");
}

const page = read("page.tsx");

// The locales registered in app/lib/i18n/config.ts (de was retired in
// step 10 — it carried only legacy sportsbook namespaces).
const SHIPPED_LOCALES = ["en", "id", "ms", "tl", "zh-Hans", "zh-Hant"];

function readPageHome(locale: string): Record<string, string> {
  return JSON.parse(
    readFileSync(
      resolve(appRoot, "../public/static/locales", locale, "page-home.json"),
      "utf-8",
    ),
  ) as Record<string, string>;
}

describe("landing ink-on-lime (step 6)", () => {
  it("keeps the retired mint/deep-green landing literals out", () => {
    const retired =
      /#07150d|#061a10|#0b3c25|#54ec9b|#71eeb8|#ff8b6b|#10c8a0|#0b4332|#0E7A52|#B8401F|#0D1114|#454C54|#6E7680|#E9EBED|43,\s*228,\s*128|#12241a|#0b1a11|#2a0f09/i;
    assert.ok(
      !retired.test(page),
      "landing must not reintroduce pre-pivot mint/deep-green literals",
    );
  });

  it("pairs every lime fill with ink-on-lime text", () => {
    // White on lime is ~1.3:1. Each className string that fills with the
    // accent must also set --ticket-cta-text (or delegate text colour to
    // its children — not used on this page).
    const classAttrs = page.match(/className=(?:"[^"]*"|\{`[^`]*`\})/g) ?? [];
    const limeFills = classAttrs.filter((c) =>
      c.includes("bg-[var(--accent)]"),
    );
    assert.ok(limeFills.length >= 4, "expected several lime-filled controls");
    for (const cls of limeFills) {
      // Textless decorative fills are exempt: the 7px consensus bar
      // (h-full) and the pulsing live dots (rounded-full).
      if (cls.includes("h-full") || cls.includes("rounded-full")) continue;
      assert.ok(
        cls.includes("text-[var(--ticket-cta-text)]"),
        `lime fill without ink-on-lime text: ${cls}`,
      );
    }
    assert.ok(
      !/bg-\[var\(--accent\)\][^"`]*text-white|text-white[^"`]*bg-\[var\(--accent\)\]/.test(
        page,
      ),
      "white text must never sit on a lime fill",
    );
  });

  it("puts near-black cards and buttons on the lime sections via --ink", () => {
    assert.match(page, /bg-\[var\(--accent\)\] py-24 text-\[var\(--ticket-cta-text\)\]/);
    assert.ok(
      (page.match(/bg-\[var\(--ink\)\]/g) ?? []).length >= 3,
      "lime sections hold near-black cards/buttons (ink surface)",
    );
  });
});

describe("landing UAT-001 — the one interactive element", () => {
  const cardSlice = page.slice(
    page.indexOf("function MarketPreviewCard"),
    page.indexOf("type TradeTicketPreviewProps"),
  );

  it("flips bar, consensus line and split from the pressed side", () => {
    assert.match(cardSlice, /const \[activeSide, setActiveSide\] = useState<MarketSide>\("yes"\)/);
    assert.match(cardSlice, /aria-pressed=\{activeSide === "yes"\}/);
    assert.match(cardSlice, /aria-pressed=\{activeSide === "no"\}/);
    assert.match(cardSlice, /width: `\$\{activePercent\}%`/);
    assert.match(cardSlice, /\{activeConsensus\}/);
    assert.match(cardSlice, /\{inactiveSideLabel\}/);
  });

  it("never navigates — no links, no router, no dead end", () => {
    assert.ok(!/<Link|href=|router\.|window\.location/.test(cardSlice));
  });

  it("marks the selection with lime on BOTH sides — direction tokens never fill controls", () => {
    assert.ok(
      !/bg-\[var\(--no\)\]|bg-\[var\(--yes\)\]/.test(page),
      "saturated direction tokens are for text and dots, never fills",
    );
    assert.match(
      cardSlice,
      /border-\[var\(--accent\)\] bg-\[var\(--accent\)\] text-\[var\(--ticket-cta-text\)\]/,
    );
  });

  it("keeps the consensus flip working in every shipped locale", () => {
    // marketSignalText rewrites the trailing "<pct>% <side>" of the
    // consensus string; every locale must keep that shape or the line
    // silently stops flipping.
    for (const locale of SHIPPED_LOCALES) {
      const strings = readPageHome(locale);
      for (const key of Object.keys(strings)) {
        if (!key.endsWith(".consensus")) continue;
        assert.match(
          strings[key],
          /\d+%\s+\S+\s*$/,
          `${locale}/${key} must end with "<pct>% <side>" for the toggle flip`,
        );
      }
    }
  });
});

describe("landing hero (step 6)", () => {
  it("draws the backdrop in the muted direction tones", () => {
    assert.match(page, /stopColor: "var\(--yes-bar\)"/);
    assert.match(page, /stroke: "var\(--yes-bar\)"/);
    assert.match(page, /stroke: "var\(--no-bar\)"/);
  });

  it("carries no hardcoded price chips on the drawn chart", () => {
    assert.ok(
      !/YES 62¢|NO 38¢/.test(page),
      "magnitude belongs to the app, not the backdrop",
    );
  });

  it("triple-gates the ambient video: reduced motion, saveData, lg breakpoint", () => {
    const video = page.slice(
      page.indexOf("function HeroAmbientVideo"),
      page.indexOf("type MarketSide"),
    );
    assert.match(video, /prefers-reduced-motion: reduce/);
    assert.match(video, /connection\?\.saveData/);
    assert.match(video, /min-width: 1024px/);
    assert.match(video, /HERO_AMBIENT_VIDEO/);
  });
});

describe("landing trade-ticket mockup (step 6)", () => {
  const mockSlice = page.slice(
    page.indexOf("function TradeTicketPreview"),
    page.indexOf("export default function HomePage"),
  );

  it("renders neutral price magnitudes — never a direction colour", () => {
    assert.match(mockSlice, /text-\[var\(--t1\)\] \$\{mono\}[\s\S]{0,40}62¢/);
    assert.match(mockSlice, /text-\[var\(--t2\)\] \$\{mono\}[\s\S]{0,40}38¢/);
  });

  it("uses the pale direction cells from the real ticket", () => {
    assert.match(mockSlice, /border-\[var\(--yes-border\)\] bg-\[var\(--yes-soft\)\]/);
    assert.match(mockSlice, /text-\[var\(--no-text\)\]/);
  });

  it("invites sign-up, not log-in — the drift that motivated the rebuild", () => {
    assert.match(page, /signUpCta=\{t\("mockup\.signUpCta"\)\}/);
    assert.ok(!page.includes("loginCta"));
    for (const locale of SHIPPED_LOCALES) {
      const strings = readPageHome(locale);
      assert.ok(
        strings["mockup.signUpCta"],
        `${locale}: mockup.signUpCta missing`,
      );
      assert.ok(
        !("mockup.loginCta" in strings),
        `${locale}: mockup.loginCta must be retired`,
      );
    }
  });

  it("stays illustrative — role=img, no interactivity", () => {
    assert.match(mockSlice, /role="img"/);
    assert.ok(!/onClick|onPointerDown|<button/.test(mockSlice));
  });
});

describe("landing footer (step 6)", () => {
  it("clamps the graphic wordmark 168px → 54px", () => {
    assert.match(page, /clamp\(54px,13vw,168px\)/);
  });
});
