import { describe, expect, it } from "vitest";
import { gatewayBaseUrl } from "../lib/market-bot/gatewayUrl";

describe("gatewayBaseUrl", () => {
  it("prefers GATEWAY_INTERNAL_URL when set", () => {
    expect(
      gatewayBaseUrl({
        GATEWAY_INTERNAL_URL: "http://gateway:18080",
        NEXT_PUBLIC_API_URL: "",
      }),
    ).toBe("http://gateway:18080");
  });

  it("falls back to NEXT_PUBLIC_API_URL when the internal URL is unset", () => {
    expect(
      gatewayBaseUrl({ NEXT_PUBLIC_API_URL: "https://api.example.dev" }),
    ).toBe("https://api.example.dev");
  });

  // The original bug: NEXT_PUBLIC_API_URL="" is falsy, so server-side calls fell
  // back to localhost inside the office container. With the internal URL set,
  // the empty public URL must NOT win.
  it("ignores an empty-string GATEWAY_INTERNAL_URL and empty public URL", () => {
    expect(
      gatewayBaseUrl({
        GATEWAY_INTERNAL_URL: "",
        NEXT_PUBLIC_API_URL: "https://api.example.dev",
      }),
    ).toBe("https://api.example.dev");
    expect(
      gatewayBaseUrl({ GATEWAY_INTERNAL_URL: "", NEXT_PUBLIC_API_URL: "" }),
    ).toBe("http://localhost:18080");
  });

  it("defaults to localhost for local dev when nothing is set", () => {
    expect(gatewayBaseUrl({})).toBe("http://localhost:18080");
  });
});
