import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import SegmentsPage from "../app/(dashboard)/segments/page";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-87 slice 1 (§21): the segmentation tag surface reads /admin/segments/tags
// and gates create/delete on segments:write (GAP-84 read-only enforcement).

function mockFetch() {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    let body: unknown = {};
    if (url.includes("/segments/query"))
      body = { userIds: ["u-1", "u-2"], total: 2 };
    else if (url.includes("/segments/campaigns"))
      body = {
        campaigns: [
          {
            id: 10,
            name: "Reactivation",
            tagId: 1,
            actionType: "notification",
            actionRef: "",
            status: "draft",
            createdAt: "2026-03-01T00:00:00Z",
          },
        ],
      };
    else if (url.includes("/segments/tags"))
      body = {
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
      };
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
    await screen.findByTestId("segment-tag-delete-1");
    // "VIP" appears both in the tags table and the query-builder tag option;
    // assert its presence within the tags card specifically.
    expect(
      within(screen.getByTestId("segments-tags")).getByText("VIP"),
    ).toBeTruthy();
  });

  it("enables create + delete for a segments:write caller", async () => {
    renderSeg(["segments:write", "segments:read"]);
    await screen.findByTestId("segment-tag-delete-1");
    fireEvent.change(screen.getByTestId("segments-name"), {
      target: { value: "New tag" },
    });
    expect(screen.getByTestId("segments-create-submit")).not.toBeDisabled();
    expect(screen.getByTestId("segment-tag-delete-1")).not.toBeDisabled();
  });

  it("disables create + delete for a read-only caller (no segments:write)", async () => {
    renderSeg(["segments:read"]);
    await screen.findByTestId("segment-tag-delete-1");
    fireEvent.change(screen.getByTestId("segments-name"), {
      target: { value: "New tag" },
    });
    expect(screen.getByTestId("segments-create-submit")).toBeDisabled();
    expect(screen.getByTestId("segment-tag-delete-1")).toBeDisabled();
  });

  // GAP-87 slice 2: the query builder runs a segment query and shows the matched
  // members (a segments:read operation — available to a read-only caller).
  it("runs a segment query and renders the matched members", async () => {
    renderSeg(["segments:read"]);
    await screen.findByTestId("segment-tag-delete-1");
    fireEvent.click(screen.getByTestId("segments-query-run"));
    const result = await screen.findByTestId("segments-query-result");
    expect(result.textContent).toContain("2 matching players");
    expect(result.textContent).toContain("u-1");
    expect(result.textContent).toContain("u-2");
  });

  // GAP-87 slice 3: campaigns list + create (create gated on segments:write).
  it("lists campaigns and gates Create campaign on segments:write", async () => {
    renderSeg(["segments:read"]);
    await screen.findByTestId("segment-tag-delete-1");
    expect(
      within(screen.getByTestId("segments-campaigns")).getByText(
        "Reactivation",
      ),
    ).toBeTruthy();
    // Read-only caller: Create campaign disabled even with a name + tag.
    fireEvent.change(screen.getByTestId("segments-campaign-name"), {
      target: { value: "Winback" },
    });
    fireEvent.change(screen.getByTestId("segments-campaign-tag"), {
      target: { value: "1" },
    });
    expect(screen.getByTestId("segments-campaign-submit")).toBeDisabled();
  });

  it("enables Create campaign for a segments:write caller", async () => {
    renderSeg(["segments:write", "segments:read"]);
    await screen.findByTestId("segment-tag-delete-1");
    fireEvent.change(screen.getByTestId("segments-campaign-name"), {
      target: { value: "Winback" },
    });
    fireEvent.change(screen.getByTestId("segments-campaign-tag"), {
      target: { value: "1" },
    });
    expect(screen.getByTestId("segments-campaign-submit")).not.toBeDisabled();
  });
});
