/**
 * components/ui Button — disabled semantics across both element modes
 * (P1 re-review 2026-07-19). The custom-render mode is the contract that
 * dissent item 2 targeted: `disabled` must never reach a non-button
 * element, and activation must be blocked even though Base UI composes
 * the render target's own handlers after ours (the guard preventDefaults
 * so well-behaved handlers — e.g. Next Link navigation — bail).
 *
 * Run: npx tsx --test app/__tests__/ui-button.test.ts
 */
// React 19 requires this flag for act() to flush effects/refs in the
// documented order outside a test framework that sets it automatically.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { create, act } from "react-test-renderer";
import { Button, checkDisabledRenderContract } from "../components/ui/Button";
import { logger } from "../lib/logger";

interface RenderedProps {
  type?: string;
  disabled?: boolean;
  "aria-disabled"?: boolean;
  tabIndex?: number;
  className?: string;
  href?: string;
  onClick?: (event: unknown) => void;
}

function renderProps(element: React.ReactElement): RenderedProps {
  let renderer: ReturnType<typeof create> | undefined;
  act(() => {
    renderer = create(element);
  });
  const root = renderer as NonNullable<typeof renderer>;
  const node = root.root.findByType(
    (root.toJSON() as { type: string }).type as never,
  );
  const props = node.props as RenderedProps;
  act(() => root.unmount());
  return props;
}

function fakeEvent() {
  return {
    preventDefault: mock.fn(),
    stopPropagation: mock.fn(),
  };
}

describe("ui/Button element modes", () => {
  it("default mode renders a typed <button> and forwards disabled", () => {
    const props = renderProps(
      createElement(Button, { disabled: true }, "Save"),
    );
    assert.equal(props.type, "button");
    assert.equal(props.disabled, true);
    assert.equal(props["aria-disabled"], undefined);
  });

  it("disabled custom render gets aria semantics, not the disabled attr", () => {
    const props = renderProps(
      createElement(
        Button,
        { disabled: true, render: createElement("a", { href: "/x" }) },
        "Go",
      ),
    );
    assert.equal(props.disabled, undefined, "no invalid disabled attr on <a>");
    assert.equal(props["aria-disabled"], true);
    assert.equal(props.tabIndex, -1);
    assert.match(props.className ?? "", /pointer-events-none/);
  });

  it("disabled custom render blocks activation even against caller onClick", () => {
    const callerClick = mock.fn();
    const props = renderProps(
      createElement(
        Button,
        {
          disabled: true,
          render: createElement("a", { href: "/x" }),
          onClick: callerClick,
        },
        "Go",
      ),
    );
    const event = fakeEvent();
    props.onClick?.(event);
    assert.equal(
      callerClick.mock.callCount(),
      0,
      "caller onClick must not run while disabled",
    );
    // The guard is attached at BOTH the hook layer and the cloned render
    // element (defense in depth); Base UI composes them, so it may fire
    // more than once. The invariant is that activation was blocked.
    assert.ok(event.preventDefault.mock.callCount() >= 1);
    assert.ok(event.stopPropagation.mock.callCount() >= 1);
  });

  it("disabled semantics survive hostile props on the render element itself", () => {
    // Codex re-review round 3: Base UI merges the render element's own
    // props over the hook's, so the disabled contract must hold even
    // when the render target carries contradicting props and its own
    // handler. The cloneElement enforcement replaces them outright.
    const targetClick = mock.fn();
    const props = renderProps(
      createElement(
        Button,
        {
          disabled: true,
          render: createElement("a", {
            href: "/x",
            "aria-disabled": false,
            tabIndex: 0,
            onClick: targetClick,
          }),
        },
        "Go",
      ),
    );
    assert.equal(props["aria-disabled"], true, "hostile aria-disabled loses");
    assert.equal(props.tabIndex, -1, "hostile tabIndex loses");
    const event = fakeEvent();
    props.onClick?.(event);
    assert.equal(
      targetClick.mock.callCount(),
      0,
      "the render target's own onClick must never run while disabled",
    );
    assert.ok(event.preventDefault.mock.callCount() >= 1);
  });

  it("enabled custom render forwards the caller onClick", () => {
    const callerClick = mock.fn();
    const props = renderProps(
      createElement(
        Button,
        { render: createElement("a", { href: "/x" }), onClick: callerClick },
        "Go",
      ),
    );
    const event = fakeEvent();
    props.onClick?.(event);
    assert.equal(callerClick.mock.callCount(), 1);
    assert.equal(event.preventDefault.mock.callCount(), 0);
  });

  // ── Dev contract detector (Codex re-review round 4) ────────────────
  // A render COMPONENT can defeat prop forcing by discarding props/ref;
  // React cannot prevent that, so the detector must REPORT both shapes.

  it("detector reports a render component that drops the ref", () => {
    const errorSpy = mock.method(logger, "error", () => undefined);
    try {
      function HostileNoRef(): React.ReactElement {
        return createElement("a", { href: "/x" }, "Go");
      }
      let r: ReturnType<typeof create> | undefined;
      act(() => {
        r = create(
          createElement(Button, {
            disabled: true,
            render: createElement(HostileNoRef as never),
          }),
        );
      });
      act(() => r?.unmount());
      const calls = errorSpy.mock.calls.map((c) => String(c.arguments[1]));
      assert.ok(
        calls.some((m) => m.includes("did not forward its ref")),
        `expected ref-violation report, got: ${JSON.stringify(calls)}`,
      );
    } finally {
      errorSpy.mock.restore();
    }
  });

  it("contract check flags a missing node as a ref violation", () => {
    const violation = checkDisabledRenderContract(null);
    assert.match(violation?.message ?? "", /did not forward its ref/);
  });

  it("contract check flags stripped attributes", () => {
    const violation = checkDisabledRenderContract({
      tagName: "A",
      getAttribute: () => null,
    });
    assert.match(violation?.message ?? "", /dropped required props/);
  });

  it("contract check flags tabindex dropped even when aria-disabled survives", () => {
    const violation = checkDisabledRenderContract({
      tagName: "A",
      getAttribute: (name: string) =>
        name === "aria-disabled" ? "true" : null,
    });
    assert.match(violation?.message ?? "", /dropped required props/);
  });

  it("contract check accepts a compliant node", () => {
    const violation = checkDisabledRenderContract({
      tagName: "A",
      getAttribute: (name: string) =>
        name === "aria-disabled" ? "true" : name === "tabindex" ? "-1" : null,
    });
    assert.equal(violation, null);
  });
});
