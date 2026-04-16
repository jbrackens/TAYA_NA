import { useWebsocket } from "../websocket-service";
import { renderHook } from "@testing-library/react-hooks";
import * as redux from "react-redux";
import { UseApiHook } from "@phoenix-ui/utils";
import { useApi } from "../../../services/api/api-service";
jest.mock("../../../services/api/api-service");

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn(),
  useSelector: jest.fn().mockImplementation(() => {
    return false;
  }),
}));

const mockedUseApiContent = useApi as jest.Mock<UseApiHook>;

const spy = jest.spyOn(redux, "useDispatch");
spy.mockReturnValue((state) => state);

global.WebSocket = WebSocket;

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {
      WS_GLOBAL_ENDPOINT: "ws://fake_url",
    },
  }),
}));

describe("websocket service test", () => {
  test("data: data should be null at the beginning", () => {
    mockedUseApiContent.mockReturnValueOnce({
      triggerApi: jest.fn(),
      isLoading: false,
      data: null,
      error: false,
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
    });
    const { result } = renderHook(() => useWebsocket());
    expect(result.current.data).toBe(null);
  });

  test("error: error should be null at the beginning", () => {
    mockedUseApiContent.mockReturnValueOnce({
      triggerApi: jest.fn(),
      isLoading: false,
      data: null,
      error: false,
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
    });
    const { result } = renderHook(() => useWebsocket());
    expect(result.current.error).toBe(null);
  });

  test("isConnectionOpen: isConnectionOpen should be false at the begininng", () => {
    mockedUseApiContent.mockReturnValueOnce({
      triggerApi: jest.fn(),
      isLoading: false,
      data: null,
      error: false,
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
    });
    const { result } = renderHook(() => useWebsocket());

    expect(result.current.isConnectionOpen).toBe(false);
  });
});
