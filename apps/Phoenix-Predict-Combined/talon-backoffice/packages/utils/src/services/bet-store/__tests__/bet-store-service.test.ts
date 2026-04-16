import { useBets } from "../bet-store-service";
import { renderHook, act } from "@testing-library/react-hooks";

describe("bet store service test", () => {
  const { result } = renderHook(() => useBets());

  test("getBets: should should be triggered with Bets", () => {
    jest.spyOn(Storage.prototype, "getItem");
    act(() => {
      result.current.getBets();
    });
    expect(sessionStorage.getItem).toBeCalledWith("Bets");
  });

  test("clearBets: should should be triggered with Bets", () => {
    jest.spyOn(Storage.prototype, "removeItem");
    act(() => {
      result.current.clearBets();
    });
    expect(sessionStorage.removeItem).toBeCalledWith("Bets");
  });

  test("saveBet: should should be triggered when parameter is proper", () => {
    jest.spyOn(Storage.prototype, "setItem");
    act(() => {
      result.current.saveBet({
        brandMarketId: "a",
        marketName: "b",
        fixtureName: "c",
        selectionId: "d",
        selectionName: "e",
        odds: {
          american: "+2000",
          decimal: 21.37,
          fractional: "20/1",
        },
        fixtureId: "a",
        fixtureStatus: "",
        sportId: "e",
      });
    });
    expect(sessionStorage.setItem).toHaveBeenCalled();
  });

  test("setBets: should should be triggered even if the parameter is null", () => {
    jest.spyOn(Storage.prototype, "setItem");
    act(() => {
      result.current.setBets(null);
    });
    expect(sessionStorage.setItem).toHaveBeenCalled();
  });
});
