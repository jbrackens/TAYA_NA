import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");
const globals = readFileSync(resolve(appRoot, "globals.css"), "utf8");
const button = readFileSync(
  resolve(appRoot, "components/ui/Button.tsx"),
  "utf8",
);
const input = readFileSync(
  resolve(appRoot, "components/ui/Input.tsx"),
  "utf8",
);
const predictionWorkspace = readFileSync(
  resolve(appRoot, "components/prediction/PredictionWorkspace.tsx"),
  "utf8",
);

describe("TapTrade purple and gold color system", () => {
  it("pins the approved neutral, brand, and market-semantic primitives", () => {
    const expected = {
      paper: "#f1f4f6",
      card: "#ffffff",
      raised: "#ebeef0",
      hairline: "#dde2e5",
      "hairline-strong": "#cbd1d5",
      ink: "#101112",
      "ink-2": "#43494d",
      "ink-3": "#576066",
      "brand-deep": "#1e1235",
      "brand-dark": "#28153f",
      "brand-purple": "#6334a8",
      "brand-lavender": "#ece3f7",
      "signal-gold": "#f5c454",
      "signal-gold-text": "#885206",
      "dir-yes": "#147536",
      "dir-yes-bar": "#86d9a5",
      "dir-no": "#c1272d",
      "dir-no-bar": "#f0a9a3",
    };

    for (const [name, hex] of Object.entries(expected)) {
      assert.match(
        globals,
        new RegExp(`--${name}:\\s*${hex};`, "i"),
        `--${name} should equal ${hex}`,
      );
    }
  });

  it("uses purple for generic interaction and gold for live or reward attention", () => {
    assert.match(globals, /--accent:\s*var\(--brand-purple\);/);
    assert.match(globals, /--accent-soft:\s*var\(--brand-lavender\);/);
    assert.match(globals, /--focus-ring:\s*var\(--brand-purple\);/);
    assert.match(globals, /--live:\s*var\(--signal-gold\);/);
    assert.match(globals, /--reward:\s*var\(--signal-gold\);/);
    assert.match(globals, /--on-gold:\s*var\(--brand-dark\);/);
    assert.doesNotMatch(globals, /--live:\s*#ff6b6b/i);
    assert.doesNotMatch(globals, /--accent:\s*var\(--lime\)/);
  });

  it("keeps primary, focus, and disabled controls contrast-safe", () => {
    assert.match(button, /bg-\[var\(--accent\)\][^\n]*text-\[var\(--ticket-cta-text\)\]/);
    assert.match(button, /focus-visible:ring-2 focus-visible:ring-\[var\(--focus-ring\)\]/);
    assert.match(button, /disabled:bg-\[var\(--inert-fill\)\][^\n]*disabled:text-\[var\(--inert-label\)\]/);
    assert.match(input, /focus-visible:shadow-\[0_0_0_2px_var\(--focus-ring\)\]/);
    assert.match(input, /disabled:bg-\[var\(--inert-fill\)\][^\n]*disabled:text-\[var\(--inert-label\)\]/);
    assert.match(input, /aria-invalid:border-\[var\(--brand-dark\)\]/);
    assert.doesNotMatch(input, /aria-invalid:border-\[var\(--no-text\)\]/);
    assert.doesNotMatch(globals, /rgba\(16,\s*200,\s*160/);
  });

  it("lets utility link colors override the base anchor reset", () => {
    assert.match(
      globals,
      /@layer base\s*\{[\s\S]*?a\s*\{\s*color:\s*inherit;/,
      "the global anchor reset must stay below Tailwind utilities",
    );
  });

  it("makes gold visible in the normal Predict first viewport as a live and featured signal", () => {
    assert.match(predictionWorkspace, /data-testid="predict-live-status"/);
    assert.match(predictionWorkspace, /bg-\[var\(--live\)\][^\n]*text-\[var\(--on-gold\)\]/);
    assert.match(predictionWorkspace, /t\("MARKET_DATA_LIVE"\)/);
    assert.match(predictionWorkspace, /border-t-\[3px\] border-t-\[var\(--signal-gold\)\]/);
    assert.doesNotMatch(
      predictionWorkspace,
      /predict-live-status[\s\S]{0,400}--(?:yes|no)/,
      "the live status must not borrow YES/NO market semantics",
    );
  });
});
