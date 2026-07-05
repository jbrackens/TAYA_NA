import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-100 (§29 read-only permission scope): the prediction-taxonomy Create
// Category / Create Series controls mutate the market taxonomy (backend gates
// markets:edit), so they gate fail-closed on can("markets:edit") — a read-only
// caller sees them disabled. Same class as GAP-95.

vi.mock("@phoenix-ui/api-client/src/prediction-client", () => ({
  createPredictionClient: () => ({
    getAdminCategories: vi.fn().mockResolvedValue([]),
    getAdminSeries: vi.fn().mockResolvedValue([]),
    getAdminTags: vi.fn().mockResolvedValue([]),
  }),
}));

import PredictionTaxonomyContainer from "../containers/prediction-taxonomy";

function renderTaxonomy(perms: string[]) {
  return render(
    <App>
      <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
        <PredictionTaxonomyContainer />
      </PermissionsContext.Provider>
    </App>,
  );
}

describe("Prediction taxonomy permission gate", () => {
  afterEach(() => vi.clearAllMocks());

  it("disables Create Category/Series for a read-only caller (no markets:edit)", async () => {
    renderTaxonomy(["markets:read"]);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /create category/i }),
      ).toBeDisabled(),
    );
    expect(
      screen.getByRole("button", { name: /create series/i }),
    ).toBeDisabled();
  });

  it("enables Create Category/Series for a markets:edit caller", async () => {
    renderTaxonomy(["markets:edit"]);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /create category/i }),
      ).not.toBeDisabled(),
    );
    expect(
      screen.getByRole("button", { name: /create series/i }),
    ).not.toBeDisabled();
  });
});
