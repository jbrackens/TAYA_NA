"use client";

/**
 * Lazy twin of ./Sheet — same props, but vaul (and its focus-trap/
 * scroll-lock deps, ~18KB gz) loads in an async chunk instead of the
 * route's first-load JS.
 *
 * Use this at band-gated call sites: render it only while the mobile
 * media query matches, so desktop never fetches the chunk and on
 * mobile the band-flip mount doubles as the warmup — the fetch starts
 * at hydration, not on the first CTA tap. A surface that needs a sheet
 * synchronously at first paint imports ./Sheet directly and pays for
 * it in first-load.
 */

import dynamic from "next/dynamic";

export const Sheet = dynamic(() => import("./Sheet").then((m) => m.Sheet), {
  ssr: false,
});
