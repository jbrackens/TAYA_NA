import { render, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../core-theme";
import { CoreModal } from "..";
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

describe("Core modal test", () => {
  test("should be visible when visible prop is true", () => {
    const { queryByText } = render(
      <ThemeProvider theme={theme}>
        <CoreModal visible={true}>testModal</CoreModal>
      </ThemeProvider>,
    );
    expect(queryByText("testModal")).toBeInTheDocument();
  });

  test("should be visible when invisible prop is false", () => {
    const { queryByText } = render(
      <ThemeProvider theme={theme}>
        <CoreModal visible={false}>testModal</CoreModal>
      </ThemeProvider>,
    );
    expect(queryByText("testModal")).not.toBeInTheDocument();
  });

  test("should should display title if provider with title prop", () => {
    const { queryByText } = render(
      <ThemeProvider theme={theme}>
        <CoreModal visible={true} title="testModalTitle"></CoreModal>
      </ThemeProvider>,
    );
    expect(queryByText("testModalTitle")).toBeInTheDocument();
  });

  test("should should display footer if provider with footer prop", () => {
    const { queryByText } = render(
      <ThemeProvider theme={theme}>
        <CoreModal visible={true} title="testModalFooter"></CoreModal>
      </ThemeProvider>,
    );
    expect(queryByText("testModalFooter")).toBeInTheDocument();
  });

  test("should call onOk function when ok button is clicked", () => {
    const okFunc = jest.fn();
    const { getByText } = render(
      <ThemeProvider theme={theme}>
        <CoreModal visible={true} okText="ok" onOk={okFunc}></CoreModal>
      </ThemeProvider>,
    );
    const button = getByText("ok");
    fireEvent.click(button);
    expect(okFunc).toBeCalled();
  });

  test("should call onCancel function when cancel button is clicked", () => {
    const cancelFunc = jest.fn();
    const { getByText } = render(
      <ThemeProvider theme={theme}>
        <CoreModal
          visible={true}
          cancelText="cancel"
          onCancel={cancelFunc}
        ></CoreModal>
      </ThemeProvider>,
    );
    const button = getByText("cancel");
    fireEvent.click(button);
    expect(cancelFunc).toBeCalled();
  });
});
