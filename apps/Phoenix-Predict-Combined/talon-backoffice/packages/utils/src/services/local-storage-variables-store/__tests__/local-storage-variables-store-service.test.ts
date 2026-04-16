import { useLocalStorageVariables } from "../local-storage-variables-store-service";
import { renderHook, act } from "@testing-library/react-hooks";

describe("localStorage store service test", () => {
  const { result } = renderHook(() => useLocalStorageVariables());

  test("getAppUserName: should should be triggered with AppUsername", () => {
    jest.spyOn(Storage.prototype, "getItem");
    act(() => {
      result.current.getAppUserName();
    });
    expect(localStorage.getItem).toBeCalledWith("AppUsername");
  });

  test("clearAppUserName: should trigger localStorage.removeItem with AppUsername as key", () => {
    jest.spyOn(Storage.prototype, "removeItem");
    act(() => {
      result.current.clearAppUserName();
    });
    expect(localStorage.removeItem).toBeCalledWith("AppUsername");
  });

  test("saveAppUserName: should trigger localStorage.setItem if only userName is proper", () => {
    jest.spyOn(Storage.prototype, "setItem");
    act(() => {
      result.current.saveAppUserName("xxxxxxx");
    });
    expect(localStorage.setItem).toHaveBeenCalled();
  });
});
