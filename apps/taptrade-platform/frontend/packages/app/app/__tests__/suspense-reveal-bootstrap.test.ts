/**
 * Regression tests for app/lib/suspense-reveal-bootstrap.ts
 *
 * The bootstrap must flush React's streamed-Suspense reveal queue
 * ($RV(window.$RB)) when the document is hidden — because on hidden pages
 * the requestAnimationFrame that React 19.2 schedules for the reveal never
 * fires, hydration client-renders the boundary, and the streamed
 * `div[hidden id="S:n"]` payload is left orphaned in the DOM (observed as
 * 8 <article> elements instead of 4 on the landing page).
 *
 * Run: npx tsx --test app/__tests__/suspense-reveal-bootstrap.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { SUSPENSE_REVEAL_BOOTSTRAP } from "../lib/suspense-reveal-bootstrap";

type Listener = () => void;

interface Harness {
  documentStub: { visibilityState: string };
  windowStub: Record<string, unknown>;
  rvCalls: unknown[][];
  fire: (target: "document" | "window", type: string) => void;
  tick: () => void;
  activeIntervals: () => number;
}

/**
 * Runs the bootstrap script inside a VM context with stubbed
 * document/window/timers, mimicking the browser globals it touches.
 * `queued` seeds window.$RB (the React reveal queue); the stub $RV empties
 * the queue like the real one does (`a.length = 0`).
 */
function boot(opts: { visibility: "hidden" | "visible"; queued?: boolean; rvThrows?: boolean }): Harness {
  const listeners = new Map<string, Listener[]>();
  const on = (target: string) => (type: string, fn: Listener) => {
    const key = `${target}:${type}`;
    listeners.set(key, [...(listeners.get(key) ?? []), fn]);
  };

  const intervals: { fn: Listener; cleared: boolean; id: number }[] = [];
  let nextId = 1;

  const documentStub = {
    visibilityState: opts.visibility,
    addEventListener: on("document"),
  };

  const rvCalls: unknown[][] = [];
  const rb: unknown[] = opts.queued ? ["TEMPLATE#B:0", "DIV#S:0"] : [];
  const windowStub: Record<string, unknown> = {
    addEventListener: on("window"),
    $RB: rb,
    $RV: (q: unknown[]) => {
      rvCalls.push([...q]);
      if (opts.rvThrows) throw new Error("boundary walk failed");
      q.length = 0; // the real $RV clears the queue after processing
    },
  };

  const context: Record<string, unknown> = {
    document: documentStub,
    window: windowStub,
    setInterval: (fn: Listener) => {
      const id = nextId++;
      intervals.push({ fn, cleared: false, id });
      return id;
    },
    clearInterval: (id: number) => {
      const entry = intervals.find((x) => x.id === id);
      if (entry) entry.cleared = true;
    },
  };
  vm.createContext(context);
  vm.runInContext(SUSPENSE_REVEAL_BOOTSTRAP, context);

  return {
    documentStub,
    windowStub,
    rvCalls,
    fire(target, type) {
      for (const fn of listeners.get(`${target}:${type}`) ?? []) fn();
    },
    tick() {
      for (const entry of intervals) {
        if (!entry.cleared) entry.fn();
      }
    },
    activeIntervals: () => intervals.filter((x) => !x.cleared).length,
  };
}

describe("suspense-reveal-bootstrap", () => {
  it("flushes the queued reveal on DOMContentLoaded when the document is hidden", () => {
    const h = boot({ visibility: "hidden", queued: true });
    assert.equal(h.rvCalls.length, 0, "must not flush at parse time before any event");
    h.fire("document", "DOMContentLoaded");
    assert.equal(h.rvCalls.length, 1, "hidden page must flush $RV at DOMContentLoaded");
    assert.deepEqual(h.rvCalls[0], ["TEMPLATE#B:0", "DIV#S:0"]);
  });

  it("stays inert on visible pages (native rAF path owns the reveal)", () => {
    const h = boot({ visibility: "visible", queued: true });
    h.fire("document", "DOMContentLoaded");
    h.tick();
    h.fire("window", "load");
    assert.equal(h.rvCalls.length, 0, "visible page must never trigger the fallback flush");
  });

  it("flushes when a visible page is hidden before the frame fires", () => {
    const h = boot({ visibility: "visible", queued: true });
    h.fire("document", "DOMContentLoaded");
    assert.equal(h.rvCalls.length, 0);
    h.documentStub.visibilityState = "hidden";
    h.fire("document", "visibilitychange");
    assert.equal(h.rvCalls.length, 1, "hiding with a pending queue must flush");
  });

  it("does not call $RV when the queue is empty", () => {
    const h = boot({ visibility: "hidden", queued: false });
    h.fire("document", "DOMContentLoaded");
    h.tick();
    assert.equal(h.rvCalls.length, 0);
  });

  it("stops its interval once the page has loaded and the queue is empty", () => {
    const h = boot({ visibility: "hidden", queued: true });
    assert.equal(h.activeIntervals(), 1);
    h.fire("document", "DOMContentLoaded"); // flush empties the queue
    h.fire("window", "load");
    assert.equal(h.activeIntervals(), 0, "interval must self-terminate after load + empty queue");
  });

  it("contains $RV exceptions and keeps the page alive", () => {
    const h = boot({ visibility: "hidden", queued: true, rvThrows: true });
    assert.doesNotThrow(() => h.fire("document", "DOMContentLoaded"));
    assert.equal(h.rvCalls.length, 1);
  });

  it("hard-stops the interval after its tick budget even if the queue never drains", () => {
    const h = boot({ visibility: "hidden", queued: true, rvThrows: true });
    for (let i = 0; i < 125; i += 1) h.tick();
    assert.equal(h.activeIntervals(), 0, "wedged queue must not poll forever");
  });
});
