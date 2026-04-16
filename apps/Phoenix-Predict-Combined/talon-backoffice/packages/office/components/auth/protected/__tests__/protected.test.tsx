import { render } from "@testing-library/react";
import Protected from "../index";
import { setupProcessMock } from "../../../../__mocks__/process";
import { setupLocalStorageMock } from "../../../../__mocks__/localstorage";
import { setupTokensMock } from "../../../../__mocks__/auth-tokens";
import { PunterRoleEnum } from "@phoenix-ui/utils";

setupLocalStorageMock();
setupProcessMock();

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

describe("Protected HOC", () => {
  beforeEach(() => {
    setupTokensMock(localStorage);
  });

  test("Shouldn't display the content", async () => {
    const { getByText } = render(
      <Protected roles={[PunterRoleEnum.TRADER]}>visible</Protected>,
    );
    let result;
    try {
      result = getByText("visible");
    } catch (e) {
      result = null;
    }
    expect(result).toBe(null);
  });

  test("Should display the content", async () => {
    const { getByText } = render(
      <Protected roles={[PunterRoleEnum.ADMIN]}>visible</Protected>,
    );
    expect(getByText("visible")).toBeTruthy();
  });
});
