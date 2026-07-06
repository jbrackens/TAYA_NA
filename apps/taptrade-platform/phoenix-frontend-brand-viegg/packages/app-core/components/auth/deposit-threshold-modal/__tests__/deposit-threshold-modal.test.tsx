import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../core-theme";
import { DepositThresholdComponent } from "../index";
import { useAcceptResponsibilityCheck } from "../../../../services/go-api/compliance/compliance-hooks";
import { clearAuth } from "../../../../services/go-api";
import {
  setIsAccountDataUpdateNeeded,
} from "../../../../lib/slices/settingsSlice";
import { logOut } from "../../../../lib/slices/authSlice";

const mockDispatch = jest.fn();
const mockMutate = jest.fn();

jest.mock("../../../../services/go-api/compliance/compliance-hooks", () => ({
  useAcceptResponsibilityCheck: jest.fn(),
}));

jest.mock("../../../../services/go-api", () => ({
  clearAuth: jest.fn(),
}));

jest.mock("react-redux", () => ({
  useDispatch: jest.fn(() => mockDispatch),
  useSelector: jest.fn(() => true),
}));

jest.mock("i18n", () => ({
  useTranslation: () => ({
    t: (value: string) => value,
  }),
}));

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

jest.mock("antd", () => {
  const React = require("react");
  const passthrough = (tag = "div") => ({ children, ...props }: any) =>
    React.createElement(tag, props, children);

  return {
    Row: passthrough(),
    Col: passthrough(),
    Button: passthrough("button"),
    Modal: passthrough(),
    Spin: passthrough(),
    Typography: { Title: passthrough("h1") },
    Collapse: Object.assign(passthrough(), { Panel: passthrough() }),
    List: Object.assign(passthrough(), {
      Item: passthrough(),
      Meta: passthrough(),
    }),
    Divider: passthrough("hr"),
  };
});

const mockedUseAcceptResponsibilityCheck =
  useAcceptResponsibilityCheck as jest.Mock;
const mockedClearAuth = clearAuth as jest.Mock;

describe("deposit threshold modal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAcceptResponsibilityCheck.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });
  });

  test("accept dispatches account refresh after Go success", () => {
    mockMutate.mockImplementation(
      (_value: void, options?: { onSuccess?: () => void }) => {
        options?.onSuccess?.();
      },
    );

    render(
      <ThemeProvider theme={theme}>
        <DepositThresholdComponent />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText("ACCEPT"));

    expect(mockMutate).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      setIsAccountDataUpdateNeeded(true),
    );
  });

  test("logout clears auth and dispatches logout", () => {
    render(
      <ThemeProvider theme={theme}>
        <DepositThresholdComponent />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText("LOGOUT"));

    expect(mockedClearAuth).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(logOut());
  });
});
