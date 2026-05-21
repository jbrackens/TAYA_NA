import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildTabsItemsFromChildren,
  type LegacyTabPaneProps,
} from "../components/layout/tabs/build-items";

// A stand-in for the office's TabPane marker. The bridge identifies panes by
// reference equality on the element type, so any component works as the marker
// as long as the test creates elements OF this type.
const TabPane: React.FC<LegacyTabPaneProps> = () => null;

// Build a marker element with an explicit React key (createElement's 2nd-arg
// `key` is how React assigns element.key, which the bridge reads).
function pane(key: string | null, props: LegacyTabPaneProps) {
  return React.createElement(TabPane, key === null ? props : { key, ...props });
}

describe("buildTabsItemsFromChildren", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a marker child to a v5 item with key + label", () => {
    const items = buildTabsItemsFromChildren(
      pane("a", { tab: "Alpha", children: "content-a" }),
      TabPane,
      "TabsSection",
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      key: "a",
      label: "Alpha",
      children: "content-a",
    });
  });

  it("prefers `label` over `tab` when both are present", () => {
    const items = buildTabsItemsFromChildren(
      pane("a", { tab: "FromTab", label: "FromLabel" }),
      TabPane,
      "TabsSection",
    );
    expect(items[0].label).toBe("FromLabel");
  });

  it("falls back to `tab` when no `label`", () => {
    const items = buildTabsItemsFromChildren(
      pane("a", { tab: "OnlyTab" }),
      TabPane,
      "TabsSection",
    );
    expect(items[0].label).toBe("OnlyTab");
  });

  it("flattens React fragments so <>...</> panes are not dropped", () => {
    const tree = React.createElement(
      React.Fragment,
      null,
      pane("a", { tab: "A" }),
      pane("b", { tab: "B" }),
    );
    const items = buildTabsItemsFromChildren(tree, TabPane, "TabsSection");
    expect(items.map((i) => i.key)).toEqual(["a", "b"]);
  });

  it("handles arrays of mapped children", () => {
    const mapped = ["x", "y", "z"].map((k) =>
      pane(k, { tab: k.toUpperCase() }),
    );
    const items = buildTabsItemsFromChildren(mapped, TabPane, "TabsSection");
    expect(items.map((i) => i.key)).toEqual(["x", "y", "z"]);
  });

  it("ignores non-marker children (stray elements don't become blank tabs)", () => {
    const tree = [
      pane("a", { tab: "A" }),
      React.createElement("div", { key: "stray" }, "not a pane"),
      pane("b", { tab: "B" }),
    ];
    const items = buildTabsItemsFromChildren(tree, TabPane, "TabsSection");
    expect(items.map((i) => i.key)).toEqual(["a", "b"]);
  });

  it("skips null / undefined / false children", () => {
    const tree = [
      pane("a", { tab: "A" }),
      null,
      undefined,
      false,
      pane("b", { tab: "B" }),
    ];
    const items = buildTabsItemsFromChildren(
      tree as React.ReactNode,
      TabPane,
      "TabsSection",
    );
    expect(items.map((i) => i.key)).toEqual(["a", "b"]);
  });

  it("renames v4 destroyInactiveTabPane → v5 destroyOnHidden", () => {
    const items = buildTabsItemsFromChildren(
      pane("a", { tab: "A", destroyInactiveTabPane: true }),
      TabPane,
      "TabsSection",
    );
    expect(items[0].destroyOnHidden).toBe(true);
  });

  it("prefers explicit destroyOnHidden over destroyInactiveTabPane", () => {
    const items = buildTabsItemsFromChildren(
      pane("a", {
        tab: "A",
        destroyOnHidden: false,
        destroyInactiveTabPane: true,
      }),
      TabPane,
      "TabsSection",
    );
    expect(items[0].destroyOnHidden).toBe(false);
  });

  it("forwards disabled / closable / closeIcon / forceRender / icon", () => {
    const closeIcon = React.createElement("span", null, "x");
    const icon = React.createElement("span", null, "i");
    const items = buildTabsItemsFromChildren(
      pane("a", {
        tab: "A",
        disabled: true,
        closable: false,
        closeIcon,
        forceRender: true,
        icon,
      }),
      TabPane,
      "TabsSection",
    );
    expect(items[0]).toMatchObject({
      disabled: true,
      closable: false,
      closeIcon,
      forceRender: true,
      icon,
    });
  });

  it("warns once (dev) when a marker child is missing a key, key falls back to ''", () => {
    const items = buildTabsItemsFromChildren(
      pane(null, { tab: "NoKey" }),
      TabPane,
      "TabsSection",
    );
    expect(items[0].key).toBe("");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain("missing a `key`");
  });

  it("returns an empty array for no children", () => {
    expect(buildTabsItemsFromChildren(null, TabPane, "TabsSection")).toEqual(
      [],
    );
  });
});
