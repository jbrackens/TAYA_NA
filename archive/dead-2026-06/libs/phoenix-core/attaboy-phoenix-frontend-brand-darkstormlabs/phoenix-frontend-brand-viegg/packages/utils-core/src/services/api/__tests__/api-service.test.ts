import("jest-fetch-mock");
import { setupLocalStorageMock } from "../../../__mocks__/localstorage";
import { cleanup } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react-hooks";
import {
  generateFetchArgs,
  Method,
  useApiHook,
  RequestHeaders,
  sanitizeHeaders,
} from "../api-service";

setupLocalStorageMock();

const FAKE_API_URL = "http://fake.url";
const fetch = global.fetch;
const localStorage = window.localStorage;

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn().mockImplementation(() => jest.fn()),
  useSelector: jest.fn().mockImplementation(() => {
    return true;
  }),
}));

const renderApiHook = (method: Method = Method.GET, path: string = "") =>
  renderHook(() =>
    useApiHook(
      path,
      method,
      FAKE_API_URL,
      () => {},
      () => {},
    ),
  );

describe("Api-service test", () => {
  beforeEach(() => {
    cleanup();
    fetch.resetMocks();
  });

  test("sanitizeHeaders: should sanitize headers input", () => {
    const headers = sanitizeHeaders({
      My_Undefined_Token: undefined,
      My_Snake_Case_PROP: "value",
      custom: "test-custom-header",
    });
    expect(headers).toStrictEqual({
      "My-Snake-Case-Prop": "value",
      Custom: "test-custom-header",
    });
  });

  test("generateFetchArgs: should return arguments with body because method is POST", () => {
    const args = generateFetchArgs(Method.PUT, {}, {}, null);
    expect(args).toStrictEqual({
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
      method: "PUT",
      body: {},
    });
  });

  test("generateFetchArgs: should return arguments without body because method is GET", () => {
    const args = generateFetchArgs(Method.GET, {}, {}, null);
    expect(args).toStrictEqual({
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
      method: "GET",
    });
  });

  test("generateFetchArgs: should return arguments with custom headers", () => {
    const args = generateFetchArgs(
      Method.GET,
      {
        custom: "test-custom-header",
      },
      {},
      null,
    );
    expect(args).toStrictEqual({
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Custom: "test-custom-header",
      },
      method: "GET",
    });
  });

  test("useApiHook: data should be undefined before trigger api function call", async () => {
    const { result } = renderApiHook();
    expect(result.current.data).toBe(undefined);
  });

  test("useApiHook: should return isLoading as false after triggerApi call and state change", async () => {
    const { result, waitForNextUpdate } = renderApiHook();
    act(() => {
      result.current.triggerApi();
    });
    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
  });

  test("useApiHook: should return proper data after triggerApi call and state change", async () => {
    fetch.mockResponseOnce(JSON.stringify({ test: "ok" }));
    const { result, waitForNextUpdate } = renderApiHook();
    act(() => {
      result.current.triggerApi();
    });
    await waitForNextUpdate();

    expect(result.current.data).toEqual({ test: "ok" });
  });

  test("useApiHook: should POST proper data after triggerApi call and state change", async () => {
    const { result, waitForNextUpdate } = renderApiHook(Method.POST);
    act(() => {
      result.current.triggerApi({
        test: "posted",
      });
    });
    await waitForNextUpdate();

    const { body } = fetch.mock.calls[0][1] || {};
    expect(JSON.parse(body as string)).toEqual({ test: "posted" });
  });

  test("useApiHook: should refresh token and re-call", async () => {
    localStorage.setItem("JdaToken", "old-token");
    localStorage.setItem("JdaTokenExpDate", JSON.stringify(Date.now() + 100));
    localStorage.setItem("RefreshToken", "refresh-token");
    localStorage.setItem(
      "RefreshTokenExpDate",
      JSON.stringify(Date.now() + 1000),
    );

    fetch.doMock((req) => {
      switch (req.url) {
        case `${FAKE_API_URL}/test-call`:
          if (req?.headers.get("Authorization")?.includes("old-token")) {
            return Promise.resolve({ body: "Not Authorized", status: 401 });
          }
          return Promise.resolve({
            body: JSON.stringify({ test: "retried" }),
            status: 200,
          });
        case `${FAKE_API_URL}/token/refresh`:
          return Promise.resolve({
            body: JSON.stringify({
              token: {
                token: "new-token",
                refreshToken: "new-refresh-token",
                expiresIn: Date.now() + 10000,
                refreshExpiresIn: Date.now() + 20000,
              },
            }),
            status: 200,
          });
        default:
          return Promise.resolve({ body: JSON.stringify({}), status: 404 });
      }
    });

    const { result, waitForNextUpdate } = renderApiHook(
      Method.GET,
      "test-call",
    );
    act(() => {
      result.current.triggerApi();
    });
    await waitForNextUpdate();

    const initialCall = fetch.mock.calls[0][1] || {};
    const refreshTokenCall = fetch.mock.calls[1][1] || {};
    const successCall = fetch.mock.calls[2][1] || {};

    expect((initialCall.headers as RequestHeaders).Authorization).toEqual(
      "Bearer old-token",
    ); // Initial call
    expect(JSON.parse(refreshTokenCall.body as string)).toEqual({
      refresh_token: "refresh-token",
    });
    expect((successCall.headers as RequestHeaders).Authorization).toEqual(
      "Bearer new-token",
    );
    expect(result.current.data).toEqual({ test: "retried" });
  });

  test("useApiHook: should return preformatted error from text", async () => {
    fetch.doMock(() =>
      Promise.resolve({ body: "Not Authorized", status: 401 }),
    );

    const { result, waitForNextUpdate } = renderApiHook(
      Method.GET,
      "error-call",
    );
    act(() => {
      result.current.triggerApi();
    });
    await waitForNextUpdate();

    expect(result.current.error).toEqual({
      message: "Not Authorized",
      statusKey: "AUTHORIZATION",
      statusCode: 401,
    });
  });

  test("useApiHook: should return preformatted error from HTML", async () => {
    fetch.doMock(() =>
      Promise.resolve({
        body: `<!DOCTYPE html>
    <html lang="en">
        <head>
            <title>Error</title>
    <style  type="text/css">
                html, body, pre {
                    margin: 0;
                    padding: 0;
                    font-family: Monaco, 'Lucida Console', monospace;
                    background: #ECECEC;
                }
                h1 {
                    margin: 0;
                    background: #A31012;
                    padding: 20px 45px;
                    color: #fff;
                    text-shadow: 1px 1px 1px rgba(0,0,0,.3);
                    border-bottom: 1px solid #690000;
                    font-size: 28px;
                }
                p#detail {
                    margin: 0;
                    padding: 15px 45px;
                    background: #F5A0A0;
                    border-top: 4px solid #D36D6D;
                    color: #730000;
                    text-shadow: 1px 1px 1px rgba(255,255,255,.3);
                    font-size: 14px;
                    border-bottom: 1px solid #BA7A7A;
                }
            </style>
        </head>
        <body>
            <h1>Oops, an error occurred</h1>
            <p id="detail">
                This exception has been logged with id <strong>7i986p483</strong>.
            </p>
        </body>
    </html>`,
        status: 500,
      }),
    );

    const { result, waitForNextUpdate } = renderApiHook(
      Method.GET,
      "error-call",
    );
    act(() => {
      result.current.triggerApi();
    });
    await waitForNextUpdate();

    expect(result.current.error).toEqual({
      message:
        "Oops, an error occurred. This exception has been logged with id 7i986p483.",
      statusKey: "INTERNAL_SERVER_ERROR",
      statusCode: 500,
    });
  });

  test("useApiHook: should return json error with proper status", async () => {
    fetch.doMock(() =>
      Promise.resolve({
        body: JSON.stringify({
          my_object: {
            prop: "test",
          },
        }),
        status: 502,
      }),
    );

    const { result, waitForNextUpdate } = renderApiHook(
      Method.GET,
      "error-call",
    );
    act(() => {
      result.current.triggerApi();
    });
    await waitForNextUpdate();

    expect(result.current.error).toEqual({
      payload: {
        my_object: {
          prop: "test",
        },
      },
      statusKey: "BAD_GATEWAY",
      statusCode: 502,
    });
  });
});
