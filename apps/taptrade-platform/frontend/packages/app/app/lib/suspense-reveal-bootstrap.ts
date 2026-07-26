/**
 * Streamed-Suspense reveal bootstrap — prevents orphaned `div[hidden id="S:*"]`
 * payload copies on pages that load without ever painting.
 *
 * React 19.2 (vendored by Next 16) batches streamed Suspense reveals: the
 * inline `$RC("B:n","S:n")` completion script no longer swaps content into
 * the boundary synchronously — it queues the (template, content) pair into
 * the global `$RB` array and defers the real swap (`$RV`) to
 * requestAnimationFrame (later flushes use a ~300ms setTimeout throttle
 * keyed off `$RT`).
 *
 * requestAnimationFrame never fires on a document that cannot produce a
 * frame: a background tab, a prerendered page, a hidden webview, a headless
 * audit. Hydration is NOT frame-gated, so on such loads React reaches the
 * queued-but-unrevealed boundary, gives up waiting, client-renders it
 * (deleting the `B:n` template), and the streamed `S:n` payload div is left
 * orphaned in the DOM — doubling the node count for the affected route —
 * until the page first paints. On this app that hits the landing page `/`,
 * the only statically prerendered route, whose built HTML bakes in the
 * streamed form of the root `loading.tsx` boundary.
 *
 * The bootstrap runs React's own flush (`$RV(window.$RB)`) whenever the
 * document is hidden and the reveal queue is non-empty, so reveal/cleanup no
 * longer depends on a frame the page cannot produce. `$RV` is safe in both
 * races: template still attached → normal reveal (React then hydrates the
 * revealed server DOM); template already client-rendered away → `$RV`
 * removes the orphaned content node and skips the swap. On visible pages
 * the bootstrap is inert — the native rAF path wins as designed.
 *
 * Injected as an inline `<script>` in the root layout `<head>` (allowed by
 * the CSP's `script-src 'unsafe-inline'`, same as the GTM loader). Kept as
 * an exported string so the logic is unit-testable — see
 * `app/__tests__/suspense-reveal-bootstrap.test.ts`.
 */
export const SUSPENSE_REVEAL_BOOTSTRAP: string = `(function () {
  var loaded = false;
  var ticks = 0;
  var timer = null;
  function stopTimer() {
    if (timer !== null) { clearInterval(timer); timer = null; }
  }
  function flush() {
    if (document.visibilityState === "hidden") {
      var q = window.$RB;
      if (q && q.length && typeof window.$RV === "function") {
        try { window.$RV(q); } catch (e) {}
      }
    }
    if (loaded && !(window.$RB && window.$RB.length)) stopTimer();
  }
  document.addEventListener("visibilitychange", flush);
  document.addEventListener("DOMContentLoaded", flush);
  window.addEventListener("load", function () { loaded = true; flush(); });
  timer = setInterval(function () {
    ticks += 1;
    if (ticks > 120) stopTimer();
    flush();
  }, 500);
})();`;
