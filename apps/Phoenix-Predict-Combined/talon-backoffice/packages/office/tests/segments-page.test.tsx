import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SegmentsPage from "../app/(dashboard)/segments/page";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-87 slice 1 (§21): the segmentation tag surface reads /admin/segments/tags
// and gates create/delete on segments:write (GAP-84 read-only enforcement).

function mockFetch() {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes("/segments/tags")
      ? {
          tags: [
            {
              id: 1,
              name: "VIP",
              description: "high value",
              group: "tier",
              memberCount: 5,
              createdAt: "2026-03-01T00:00:00Z",
            },
          ],
        }
      : {};
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  }) as unknown as typeof fetch;
}

function renderSeg(perms: string[]) {
  return render(
    <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
      <SegmentsPage />
    </PermissionsContext.Provider>,
  );
}

describe("Segments page", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => mockFetch());
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("lists tags from the segments API", async () => {
    renderSeg(["segments:read"]);
    expect(await screen.findByText("VIP")).toBeTruthy();
  });

  it("enables create + delete for a segments:write caller", async () => {
    renderSeg(["segments:write", "segments:read"]);
    await screen.findByText("VIP");
    fireEvent.change(screen.getByTestId("segments-name"), {
      target: { value: "New tag" },
    });
    expect(screen.getByTestId("segments-create-submit")).not.toBeDisabled();
    expect(screen.getByTestId("segment-tag-delete-1")).not.toBeDisabled();
  });

  it("disables create + delete for a read-only caller (no segments:write)", async () => {
    renderSeg(["segments:read"]);
    await screen.findByText("VIP");
    fireEvent.change(screen.getByTestId("segments-name"), {
      target: { value: "New tag" },
    });
    expect(screen.getByTestId("segments-create-submit")).toBeDisabled();
    expect(screen.getByTestId("segment-tag-delete-1")).toBeDisabled();
  });
});
