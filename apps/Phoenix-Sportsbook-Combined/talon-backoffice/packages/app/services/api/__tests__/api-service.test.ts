import { useApi } from "../api-service";
import { useApiHookTyped, Method } from "@phoenix-ui/utils";
import { logOut, onSucceededLogin } from "../../../lib/slices/authSlice";

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
  Method: {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE",
    PATCH: "PATCH",
  },
}));

jest.mock("../../../lib/slices/authSlice", () => ({
  logOut: jest.fn(),
  onSucceededLogin: jest.fn(),
}));

const mockUseApiHookTyped = useApiHookTyped as jest.Mock;

describe("app api service contract", () => {
  beforeEach(() => {
    mockUseApiHookTyped.mockReset();
  });

  test("uses API_GLOBAL_ENDPOINT when baseUrl is not provided", () => {
    const hookReturn = {
      triggerApi: jest.fn(),
      isLoading: false,
      data: undefined,
      error: undefined,
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
    };
    mockUseApiHookTyped.mockReturnValue(hookReturn);

    const result = useApi("/api/v1/status", Method.GET);

    expect(mockUseApiHookTyped).toHaveBeenCalledWith(
      "/api/v1/status",
      Method.GET,
      "http://global.api.endpoint",
      onSucceededLogin,
      logOut,
    );
    expect(result).toBe(hookReturn);
  });

  test("uses explicit baseUrl override when provided", () => {
    mockUseApiHookTyped.mockReturnValue({
      triggerApi: jest.fn(),
      isLoading: false,
      data: { ok: true },
      error: undefined,
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
    });

    useApi("/api/v1/fixtures", Method.GET, "http://override.api.endpoint");

    expect(mockUseApiHookTyped).toHaveBeenCalledWith(
      "/api/v1/fixtures",
      Method.GET,
      "http://override.api.endpoint",
      onSucceededLogin,
      logOut,
    );
  });

  test("supports string method values for existing call sites", () => {
    mockUseApiHookTyped.mockReturnValue({
      triggerApi: jest.fn(),
      isLoading: false,
      data: undefined,
      error: undefined,
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
    });

    useApi("/api/v1/fixtures", "GET");

    expect(mockUseApiHookTyped).toHaveBeenCalledWith(
      "/api/v1/fixtures",
      "GET",
      "http://global.api.endpoint",
      onSucceededLogin,
      logOut,
    );
  });
});
