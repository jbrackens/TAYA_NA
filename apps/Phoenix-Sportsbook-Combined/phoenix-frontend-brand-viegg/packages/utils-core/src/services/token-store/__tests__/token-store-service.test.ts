import { useToken } from "../token-store-service";
import { renderHook, act } from "@testing-library/react-hooks";

describe("token store service test", () => {
  const { result } = renderHook(() => useToken());

  test("getToken: should should be triggered with JdaToken", () => {
    jest.spyOn(Storage.prototype, "getItem");
    act(() => {
      result.current.getToken();
    });
    expect(localStorage.getItem).toBeCalledWith("JdaToken");
  });

  test("getRefreshToken: should should be triggered with RefreshToken", () => {
    jest.spyOn(Storage.prototype, "getItem");
    act(() => {
      result.current.getRefreshToken();
    });
    expect(localStorage.getItem).toBeCalledWith("RefreshToken");
  });

  test("clearToken: should trigger localStorage.removeItem with JdaToken as key", () => {
    jest.spyOn(Storage.prototype, "removeItem");
    act(() => {
      result.current.clearToken();
    });
    expect(localStorage.removeItem).toBeCalledWith("JdaToken");
  });

  test("clearRefreshToken: should trigger localStorage.removeItem with RefreshToken as key", () => {
    jest.spyOn(Storage.prototype, "removeItem");
    act(() => {
      result.current.clearRefreshToken();
    });
    expect(localStorage.removeItem).toBeCalledWith("RefreshToken");
  });

  test("saveJdaToken: should do nothing if token is null", () => {
    jest.spyOn(Storage.prototype, "setItem");
    act(() => {
      result.current.saveToken(null, "JdaToken");
    });
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  test("saveToken: should trigger localStorage.setItem if only access token is proper", () => {
    jest.spyOn(Storage.prototype, "setItem");
    act(() => {
      result.current.saveToken("xxxxxxx");
    });
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  test("saveToken: should trigger localStorage.setItem if both tokens are proper", () => {
    jest.spyOn(Storage.prototype, "setItem");
    act(() => {
      result.current.saveToken("xxxxxxx", "yyyyy");
    });
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  test("getTokenExpDate: should trigger localStorage.getItem with jdaTokenExpDate", () => {
    jest.spyOn(Storage.prototype, "getItem");
    act(() => {
      result.current.getTokenExpDate();
    });
    expect(localStorage.getItem).toBeCalledWith("JdaTokenExpDate");
  });

  test("getRefreshTokenExpDate: should trigger localStorage.getItem with RefreshTokenExpDate", () => {
    jest.spyOn(Storage.prototype, "getItem");
    act(() => {
      result.current.getRefreshTokenExpDate();
    });
    expect(localStorage.getItem).toBeCalledWith("RefreshTokenExpDate");
  });

  test("saveTokenExpDate: should trigger localStorage.setItem if both tokens are proper", () => {
    jest.spyOn(Storage.prototype, "setItem");
    act(() => {
      result.current.saveTokenExpDate(1, 2);
    });
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  test("clearTokenExpDate: should trigger localStorage.removeItem with JdaTokenExpDate as key", () => {
    jest.spyOn(Storage.prototype, "removeItem");
    act(() => {
      result.current.clearTokenExpDate();
    });
    expect(localStorage.removeItem).toBeCalledWith("JdaTokenExpDate");
  });

  test("clearRefreshTokenExpDate: should trigger localStorage.removeItem with RefreshTokenExpDate as key", () => {
    jest.spyOn(Storage.prototype, "removeItem");
    act(() => {
      result.current.clearRefreshTokenExpDate();
    });
    expect(localStorage.removeItem).toBeCalledWith("RefreshTokenExpDate");
  });

  test("saveUserId: should should be triggered if userId is proper", () => {
    jest.spyOn(Storage.prototype, "setItem");
    act(() => {
      result.current.saveUserId('xxxxxx');
    });
    expect(localStorage.setItem).toBeCalled;
  });

  test("clearUserId: should trigger localStorage.removeItem with UserId as key", () => {
    jest.spyOn(Storage.prototype, "removeItem");
    act(() => {
      result.current.clearUserId();
    });
    expect(localStorage.removeItem).toBeCalledWith("UserId");
  });

  test("getUserid: should trigger localStorage.getItem with UserId", () => {
    jest.spyOn(Storage.prototype, "getItem");
    act(() => {
      result.current.getUserId();
    });
    expect(localStorage.getItem).toBeCalledWith("UserId");
  });

});
