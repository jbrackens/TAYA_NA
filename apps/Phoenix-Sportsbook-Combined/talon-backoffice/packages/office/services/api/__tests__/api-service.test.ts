import { normalizeOfficeApiPath, useApi } from "../api-service";
import {
  useApiHookTyped,
  useSpy,
  Method,
  UseApiHook,
} from "@phoenix-ui/utils";
import { shouldLogoutUser } from "../../../lib/slices/authSlice";

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {
      API_GLOBAL_ENDPOINT: "http://global.api.endpoint",
    },
  }),
}));

jest.mock("@phoenix-ui/utils", () => ({
  ...jest.requireActual("@phoenix-ui/utils"),
  useApiHookTyped: jest.fn(),
  useSpy: jest.fn(),
  Method: {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE",
    PATCH: "PATCH",
  },
}));

jest.mock("../../../lib/slices/authSlice", () => ({
  shouldLogoutUser: jest.fn(),
}));

const mockUseApiHookTyped = useApiHookTyped as jest.Mock;
const mockUseSpy = useSpy as jest.Mock;

const baseHookReturn: UseApiHook = {
  triggerApi: jest.fn(),
  isLoading: false,
  data: undefined,
  error: undefined,
  statusOk: undefined,
  triggerRefresh: jest.fn(),
  resetHookState: jest.fn(),
};

describe("office api service contract", () => {
  beforeEach(() => {
    mockUseApiHookTyped.mockReset();
    mockUseSpy.mockReset();
    mockUseSpy.mockReturnValue({ spy: jest.fn() });
  });

  test("uses API_GLOBAL_ENDPOINT with shouldLogoutUser handler", () => {
    const onSucceeded = jest.fn();
    mockUseApiHookTyped.mockReturnValue(baseHookReturn);

    useApi("/api/v1/users", Method.GET, onSucceeded);

    expect(mockUseApiHookTyped).toHaveBeenCalledWith(
      "/api/v1/users",
      Method.GET,
      "http://global.api.endpoint",
      onSucceeded,
      shouldLogoutUser,
    );
  });

  test("normalizes legacy office auth and timeline routes to Go gateway paths", () => {
    expect(normalizeOfficeApiPath("login")).toBe("auth/login");
    expect(normalizeOfficeApiPath("logout")).toBe("auth/logout");
    expect(normalizeOfficeApiPath("admin/punters/:id/recent-activities")).toBe(
      "admin/punters/:id/timeline",
    );
    expect(normalizeOfficeApiPath("/api/v1/users")).toBe("/api/v1/users");
  });

  test("maps hook error into failed response", () => {
    mockUseApiHookTyped.mockReturnValue({
      ...baseHookReturn,
      error: { message: "denied" },
    });

    const [, , response] = useApi("/api/v1/settings", Method.GET);

    expect(response).toEqual({
      succeeded: false,
      error: { message: "denied" },
    });
  });

  test("maps statusOk into succeeded response payload", () => {
    mockUseApiHookTyped.mockReturnValue({
      ...baseHookReturn,
      statusOk: true,
      data: { enabled: true },
    });

    const [, , response] = useApi("/api/v1/settings", Method.GET);

    expect(response).toEqual({
      succeeded: true,
      data: { enabled: true },
    });
  });

  test("dispatches alert event when idle call has error", () => {
    const spyInvoker = jest.fn((_: boolean, callback: Function) => callback());
    mockUseSpy.mockReturnValue({ spy: spyInvoker });
    mockUseApiHookTyped.mockReturnValue({
      ...baseHookReturn,
      isLoading: false,
      error: { message: "boom" },
    });

    const dispatchSpy = jest.spyOn(window, "dispatchEvent");

    useApi("/api/v1/settings", Method.GET);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe("alert");
    expect(event.detail).toEqual({ message: "boom" });

    dispatchSpy.mockRestore();
  });
});
