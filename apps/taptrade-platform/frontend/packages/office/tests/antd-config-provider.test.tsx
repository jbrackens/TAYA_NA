import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "antd";
import AntdConfigProvider from "../app/lib/antd-config-provider";

// Render tests for the centralized AntD v5 ConfigProvider + <App> wrapper.
// This is the v5 `App.useApp()` provider that supplies message/notification/
// modal context to the whole office tree. It also disables AntD motion tokens
// when `prefers-reduced-motion: reduce` is set. Render-testing it requires
// React-19-compatible RTL (the v11 -> v16 upgrade) plus a matchMedia stub,
// since happy-dom's default matchMedia has no change-event emitter.
//
// We assert two things that don't require asserting on AntD internals:
//   1. children render inside the provider tree (no context crash)
//   2. App.useApp() resolves a live message API inside the provider — proving
//      the <App> context this provider exists to supply is actually wired.

type MatchMediaResult = {
  matches: boolean;
  media: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  onchange: null;
  dispatchEvent: ReturnType<typeof vi.fn>;
};

function stubMatchMedia(matches: boolean): void {
  const make = (query: string): MatchMediaResult => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => make(query)),
  });
}

describe("AntdConfigProvider", () => {
  const realMatchMedia = window.matchMedia;

  beforeEach(() => {
    stubMatchMedia(false);
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: realMatchMedia,
    });
    vi.restoreAllMocks();
  });

  it("renders children inside the ConfigProvider/App tree", () => {
    render(
      <AntdConfigProvider>
        <div data-testid="child">office content</div>
      </AntdConfigProvider>,
    );
    expect(screen.getByTestId("child")).toHaveTextContent("office content");
  });

  it("provides the v5 App.useApp() message context to descendants", () => {
    // A consumer that throws unless it is inside an <App> provider. AntD's
    // App.useApp() returns a real message instance only when the surrounding
    // <App> context is present — this is exactly what AntdConfigProvider adds.
    function Consumer() {
      const { message } = App.useApp();
      return (
        <span data-testid="has-message">
          {typeof message.success === "function" ? "ready" : "missing"}
        </span>
      );
    }
    render(
      <AntdConfigProvider>
        <Consumer />
      </AntdConfigProvider>,
    );
    expect(screen.getByTestId("has-message")).toHaveTextContent("ready");
  });

  it("subscribes to the reduced-motion media query on mount", () => {
    render(
      <AntdConfigProvider>
        <div>x</div>
      </AntdConfigProvider>,
    );
    const mm = window.matchMedia as unknown as ReturnType<typeof vi.fn>;
    expect(mm).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });

  it("still renders when prefers-reduced-motion is set (motion tokens off)", () => {
    stubMatchMedia(true);
    render(
      <AntdConfigProvider>
        <div data-testid="child">reduced</div>
      </AntdConfigProvider>,
    );
    expect(screen.getByTestId("child")).toHaveTextContent("reduced");
  });
});
