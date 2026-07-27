/**
 * Ink & lime step 8 — /account (Account.dc.html 17a/17b), the last surface.
 *
 * Source-level assertions (repo convention — node:test, no DOM harness)
 * pinning the step's contracts:
 *  - points move from accent to ink: the balance and every stat value are
 *    neutral magnitudes; ONLY the settled result keeps a direction colour
 *  - the avatar keeps the lime tint with ink on it — the one place
 *    identity and accent legitimately overlap
 *  - action cards follow the hover rule (stronger hairline + shadow,
 *    never a background change) and keep their Lucide icons from source
 *  - Profile links to /account/settings (the stale /account/security
 *    double-link was a leftover from the crashed pages-router settings)
 *  - the grid survives five cards as well as six (Play responsibly is
 *    behind FEATURE_RG; auto-fill is count-agnostic)
 *  - the login credential failure is humanized and localized
 *  - the 390 header fix: the tier pill clips/truncates instead of
 *    bleeding, and ultra-narrow widths keep balance-number priority
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(appRoot, rel), "utf-8");
}

const account = read("account/page.tsx");
const topBar = read("components/prediction/TopBar.tsx");
const tierPill = read("components/prediction/TierPill.tsx");
const login = read("auth/login/page.tsx");

const SHIPPED_LOCALES = ["en", "id", "ms", "tl", "zh-Hans", "zh-Hant"];

describe("account values are neutral ink (step 8)", () => {
  it("renders the balance and stat values in ink, never accent", () => {
    assert.ok(
      !account.includes("text-[var(--accent)]"),
      "lime is action/identity tint on this screen, never a value colour",
    );
    assert.match(
      account,
      /font-mono text-\[22px\] font-medium tracking-\[-0\.01em\] text-\[var\(--t1\)\]/,
    );
  });

  it("keeps a direction colour ONLY on the settled result", () => {
    assert.match(account, /tone=\{pnlUp \? "yes" : "no"\}/);
    assert.ok(!account.includes('"gain"'), "the gain tone is retired");
    const accuracy = account.slice(
      account.indexOf('t("stats.accuracy"'),
      account.indexOf("</section>", account.indexOf('t("stats.accuracy"')),
    );
    assert.ok(
      !accuracy.includes("tone="),
      "accuracy is a magnitude — neutral ink",
    );
  });

  it("keeps the lime-tint avatar with ink on it", () => {
    assert.match(
      account,
      /color-mix\(in_srgb,var\(--lime\)_32%,transparent\)[^"]*text-\[var\(--ticket-cta-text\)\]/,
    );
    assert.ok(!/rgba\(43,\s*228,\s*128/.test(account), "mint literals gone");
  });
});

describe("account actions grid (step 8)", () => {
  it("hover is hairline + shadow, never a background change", () => {
    assert.match(
      account,
      /hover:border-\[var\(--border-2\)\] hover:shadow-\[var\(--shadow-card-hover\)\]/,
    );
    assert.ok(!account.includes("hover:bg-["));
  });

  it("keeps the five Lucide icons read from source", () => {
    assert.match(
      account,
      /import \{ Bell, HeartHandshake, Lock, Settings, TrendingUp \} from "lucide-react"/,
    );
  });

  it("routes Profile to /account/settings and Security to /account/security", () => {
    assert.match(account, /href="\/account\/settings"[\s\S]{0,200}actions\.profile\.title/);
    assert.match(account, /href="\/account\/security"[\s\S]{0,200}actions\.security\.title/);
  });

  it("survives five cards as well as six — Play responsibly is flag-gated", () => {
    assert.match(account, /\{FEATURE_RG && \(/);
    assert.match(
      account,
      /grid-cols-\[repeat\(auto-fill,minmax\(260px,1fr\)\)\]/,
      "auto-fill is count-agnostic, and collapses to one column at 390",
    );
  });

  it("paints the privacy save-error with the direction tokens", () => {
    assert.match(
      account,
      /border-\[var\(--no-border\)\] bg-\[var\(--no-soft\)\][^"]*text-\[var\(--no-text\)\]/,
    );
    assert.ok(!/rgba\(255,\s*155,\s*107/.test(account));
  });
});

describe("header chips at 390 (step 8)", () => {
  it("clips and truncates the tier pill instead of bleeding", () => {
    assert.match(tierPill, /overflow-hidden/);
    assert.match(tierPill, /min-w-0 truncate/);
    assert.match(tierPill, /max-\[419px\]:hidden/);
  });

  it("keeps balance-number priority at ultra-narrow widths", () => {
    assert.match(tierPill, /max-\[359px\]:hidden/);
    assert.match(topBar, /TOP_BAR_BALANCE_LABEL_CLASS =\s*\n?\s*"[^"]*max-\[359px\]:hidden/);
    assert.match(topBar, /TOP_BAR_BALANCE_CLASS =\s*\n?\s*"inline-flex min-h-11 shrink-0/);
  });

  it("retires the white-on-lime avatar and its P10 purple hover", () => {
    assert.ok(!topBar.includes("#6d63dc"));
    assert.match(
      topBar,
      /TOP_BAR_AVATAR_CLASS =[\s\S]{0,400}text-\[var\(--ticket-cta-text\)\]/,
    );
    assert.ok(
      !/TOP_BAR_AVATAR_CLASS =[\s\S]{0,400}text-white/.test(topBar),
      "ink on lime, never white",
    );
  });

  it("shows the balance as ink, not direction green", () => {
    assert.ok(
      !/TOP_BAR_BALANCE_CLASS =[\s\S]{0,400}--yes-text/.test(topBar),
      "a balance is a magnitude, not a direction",
    );
    assert.match(topBar, /TOP_BAR_BALANCE_CLASS =[\s\S]{0,400}text-\[var\(--t1\)\]/);
  });
});

describe("login credential failure copy (step 8)", () => {
  it("maps the raw server message to the localized string", () => {
    assert.match(
      login,
      /invalid username or password[\s\S]{0,200}INCORRECT_CREDENTIALS/,
    );
  });

  it("ships the string in every locale", () => {
    for (const locale of SHIPPED_LOCALES) {
      const strings = JSON.parse(
        readFileSync(
          resolve(appRoot, "../public/static/locales", locale, "login.json"),
          "utf-8",
        ),
      ) as Record<string, string>;
      assert.ok(
        strings.INCORRECT_CREDENTIALS,
        `${locale}: INCORRECT_CREDENTIALS missing`,
      );
    }
  });
});
