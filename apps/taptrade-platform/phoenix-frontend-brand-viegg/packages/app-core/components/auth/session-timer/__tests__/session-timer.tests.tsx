import { SessionTimerComponent } from "../index";
import { render, screen } from "@testing-library/react";
import React from "react";
import { useCurrentSession } from "../../../../services/go-api/compliance/compliance-hooks";

jest.mock("../../../../services/go-api/compliance/compliance-hooks", () => ({
  useCurrentSession: jest.fn(),
}));

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useSelector: jest.fn().mockReturnValue(true),
}));

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

const mockedUseCurrentSession = useCurrentSession as jest.Mock;

describe("session timer", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders the elapsed session time from the Go session hook", () => {
    mockedUseCurrentSession.mockReturnValue({
      data: {
        currentTime: "2021-07-30T21:27:35.528698Z",
        sessionStartTime: "2021-07-30T21:21:32.288664Z",
      },
    });

    render(<SessionTimerComponent />);

    expect(screen.getByText("SESSION: 0h 6m")).toBeTruthy();
  });

  test("renders nothing when the Go session hook has no session", () => {
    mockedUseCurrentSession.mockReturnValue({
      data: undefined,
    });

    const { container } = render(<SessionTimerComponent />);

    expect(container.firstChild).toBeNull();
  });
});
