import { IntegrationMode } from "../integration-mode";
import { parseConfigList, resolveConfigList } from "../module-config-parser";

type DemoModule = "alpha" | "beta" | "gamma";

const isDemoModule = (value: string): value is DemoModule =>
  value === "alpha" || value === "beta" || value === "gamma";

const DEMO_DEFAULTS: Record<IntegrationMode, DemoModule[]> = {
  [IntegrationMode.FULL]: ["alpha", "beta", "gamma"],
  [IntegrationMode.MODULE]: ["alpha", "beta"],
  [IntegrationMode.ODDS_FEED]: ["alpha"],
};

describe("module config parser", () => {
  test("returns empty list when value is empty", () => {
    expect(parseConfigList(undefined, isDemoModule)).toEqual([]);
    expect(parseConfigList("", isDemoModule)).toEqual([]);
  });

  test("filters invalid values and keeps first-seen unique values", () => {
    expect(
      parseConfigList("alpha, beta, alpha,invalid, gamma", isDemoModule),
    ).toEqual(["alpha", "beta", "gamma"]);
  });

  test("resolve uses mode defaults when no override is valid", () => {
    expect(
      resolveConfigList(
        IntegrationMode.ODDS_FEED,
        DEMO_DEFAULTS,
        "unknown",
        isDemoModule,
      ),
    ).toEqual(["alpha"]);
  });

  test("resolve prefers parsed override order when provided", () => {
    expect(
      resolveConfigList(
        IntegrationMode.FULL,
        DEMO_DEFAULTS,
        "gamma,alpha",
        isDemoModule,
      ),
    ).toEqual(["gamma", "alpha"]);
  });
});
