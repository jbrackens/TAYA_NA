import {
  buildFixedExoticQuoteRequest,
  resolveFixedExoticType,
} from "../multi-leg-placement";

const twoLegs = [
  {
    brandMarketId: "m:o:1001",
    selectionId: "sel-1",
    odds: { decimal: 2.1 },
  },
  {
    brandMarketId: "m:o:1002",
    selectionId: "sel-2",
    odds: { decimal: 3.3 },
  },
] as any;

const threeLegs = [
  ...twoLegs,
  {
    brandMarketId: "m:o:1003",
    selectionId: "sel-3",
    odds: { decimal: 4.4 },
  },
] as any;

describe("multi-leg fixed exotic placement helpers", () => {
  test("resolves fixed-exotic type by leg count", () => {
    expect(resolveFixedExoticType(2)).toBe("exacta");
    expect(resolveFixedExoticType(3)).toBe("trifecta");
    expect(resolveFixedExoticType(4)).toBeNull();
  });

  test("builds exacta request with ordered positions", () => {
    const request = buildFixedExoticQuoteRequest(
      {
        userId: "u-1",
        requestId: "fixed-req-1",
        stakeCents: 500,
      },
      twoLegs,
    );

    expect(request).toEqual({
      userId: "u-1",
      requestId: "fixed-req-1",
      exoticType: "exacta",
      stakeCents: 500,
      legs: [
        {
          position: 1,
          marketId: "m:o:1001",
          selectionId: "sel-1",
          requestedOdds: 2.1,
        },
        {
          position: 2,
          marketId: "m:o:1002",
          selectionId: "sel-2",
          requestedOdds: 3.3,
        },
      ],
    });
  });

  test("builds trifecta request for three-leg slips", () => {
    const request = buildFixedExoticQuoteRequest(
      {
        userId: "u-1",
        requestId: "fixed-req-2",
        stakeCents: 750,
      },
      threeLegs,
    );

    expect(request?.exoticType).toBe("trifecta");
    expect(request?.legs.map((leg) => leg.position)).toEqual([1, 2, 3]);
  });

  test("returns null when userId/requestId missing or leg count unsupported", () => {
    expect(
      buildFixedExoticQuoteRequest(
        {
          userId: "",
          requestId: "x",
          stakeCents: 100,
        },
        twoLegs,
      ),
    ).toBeNull();
    expect(
      buildFixedExoticQuoteRequest(
        {
          userId: "u",
          requestId: "",
          stakeCents: 100,
        },
        twoLegs,
      ),
    ).toBeNull();
    expect(
      buildFixedExoticQuoteRequest(
        {
          userId: "u",
          requestId: "x",
          stakeCents: 100,
        },
        [...threeLegs, { brandMarketId: "m:o:1004", selectionId: "sel-4" }] as any,
      ),
    ).toBeNull();
  });
});
