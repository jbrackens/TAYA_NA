import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../core-theme";
import { CoreButton } from "..";
import "@testing-library/jest-dom";

//declared becuase of TypeError: window.matchMedia is not a function
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

describe("Core button test", () => {
  test("should have proper className", () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <CoreButton className="default" />
      </ThemeProvider>,
    );
    expect(container.getElementsByClassName("default").length).toBe(1);
  });

  test("should call function on click", () => {
    const testFunc = jest.fn();
    render(
      <ThemeProvider theme={theme}>
        <CoreButton onClick={testFunc}>testButton</CoreButton>
      </ThemeProvider>,
    );
    const button = screen.getByText("testButton");
    fireEvent.click(button);
    expect(testFunc).toBeCalled();
  });

  test("should not call func if disbled prop is true", () => {
    const testFunc = jest.fn();
    render(
      <ThemeProvider theme={theme}>
        <CoreButton onClick={testFunc} disabled>
          testButton
        </CoreButton>
      </ThemeProvider>,
    );
    const button = screen.getByText("testButton");
    fireEvent.click(button);
    expect(testFunc).not.toBeCalled();
  });

  test("should have proper bgcolor if type is primary", () => {
    render(
      <ThemeProvider theme={theme}>
        <CoreButton type="primary" testId="primaryButton">
          testButton
        </CoreButton>
      </ThemeProvider>,
    );
    const primaryColor = theme.uiComponents.buttons.primary.backgroundColor;
    const button = screen.queryByTestId("primaryButton");
    expect(button).toHaveStyle(`background-color: ${primaryColor}`);
  });

  test("should have proper bgcolor if type is default", () => {
    render(
      <ThemeProvider theme={theme}>
        <CoreButton type="default" testId="defaultButton">
          testButton
        </CoreButton>
      </ThemeProvider>,
    );
    const defaultColor = theme.uiComponents.buttons.default.backgroundColor;
    const button = screen.queryByTestId("defaultButton");
    expect(button).toHaveStyle(`background-color: ${defaultColor}`);
  });

  test("danger button should have proper background color", () => {
    render(
      <ThemeProvider theme={theme}>
        <CoreButton testId="dangerButton" danger>
          testButton
        </CoreButton>
      </ThemeProvider>,
    );
    const dangerColor = theme.uiComponents.buttons.danger.backgroundColor;
    const button = screen.queryByTestId("dangerButton");
    expect(button).toHaveStyle(`background-color: ${dangerColor}`);
  });
});
