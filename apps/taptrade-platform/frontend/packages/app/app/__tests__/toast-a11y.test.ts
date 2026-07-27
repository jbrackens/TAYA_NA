/**
 * Toast a11y + API contract (P3 sonner adapter). The provider was
 * rewritten on sonner; these greps pin the parts that must survive any
 * future refactor: the error-interrupts a11y split, the 76px top offset
 * (toasts sit below the 64px header), the OVERLAY_Z.toast layer, and the
 * unchanged useToast() call-site API that ten surfaces consume.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(
  join(__dirname, "..", "components", "ToastProvider.tsx"),
  "utf8",
);

test("errors interrupt; informational toasts stay polite", () => {
  assert.match(src, /role=\{toast\.type === "error" \? "alert" : "status"\}/);
  assert.match(
    src,
    /aria-live=\{toast\.type === "error" \? "assertive" : "polite"\}/,
  );
});

test("toasts render below the header at the 76px contract offset", () => {
  assert.match(src, /offset=\{\{ top: 76, right: 16 \}\}/);
  assert.match(src, /mobileOffset=\{\{ top: 76, right: 16 \}\}/);
});

test("toast layer matches OVERLAY_Z.toast (z 300)", () => {
  assert.match(src, /zIndex: 300/);
  const overlay = readFileSync(
    join(__dirname, "..", "components", "ui", "variants.ts"),
    "utf8",
  );
  assert.match(overlay, /toast: "z-\[300\]"/);
});

test("useToast() keeps the four helpers + addToast/removeToast", () => {
  // Updated for Ink & lime step 8 (§3-07): the helpers grew a third
  // per-toast options argument so receipts (partial fills, rejections,
  // settlements) can pass a longer duration. This pins the NEW contract.
  for (const helper of ["success", "error", "info", "warning"]) {
    assert.match(
      src,
      new RegExp(`${helper}: \\(title, message, opts\\) =>`),
      `${helper} helper missing`,
    );
  }
  assert.match(src, /addToast: show/);
  assert.match(src, /removeToast: \(id\) => sonnerToast\.dismiss\(id\)/);
});

test("sonner owns scheduling — no hand-rolled timers remain", () => {
  assert.doesNotMatch(src, /setTimeout/);
  assert.doesNotMatch(src, /useState<Toast\[\]>/);
});
