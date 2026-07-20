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
import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { create, act } from "react-test-renderer";
import { Button } from "../components/ui/Button";

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
    assert.equal(event.preventDefault.mock.callCount(), 1);
    assert.equal(event.stopPropagation.mock.callCount(), 1);
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
});
