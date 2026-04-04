import("jest-fetch-mock");
import MatchMediaMock from "jest-matchmedia-mock";
import {
  render,
  act,
  cleanup,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { setupLocalStorageMock } from "../../../../../__mocks__/localstorage";
import { setupProcessMock } from "../../../../../__mocks__/process";
import { first } from "lodash";
import { Provider } from "react-redux";
import store from "../../../../../store";
import MarketLifecycleSettle from "../index";
import { MarketLifecycleTypeEnum } from "@phoenix-ui/utils";
import { MarketLifecycleType } from "../../../../../../utils/src/types/market/index";

setupLocalStorageMock();
setupProcessMock();

let matchMedia: any;
const fetch = global.fetch;
const apiUrl = "http://fake.url";

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {
      API_GLOBAL_ENDPOINT: "http://fake.url",
    },
  }),
}));

const AllTheProviders = ({ children }: any) => {
  return <Provider store={store}>{children}</Provider>;
};

const renderProps = {
  id: "sample-id",
  labels: {
    settle: "LABEL_SETTLE",
    resettle: "LABEL_RESETTLE",
  },
  selections: [
    {
      selectionId: "sample-selection",
      selectionName: "LABEL_SAMPLE_SELECTION",
    },
    {
      selectionId: "sample-selection-2",
      selectionName: "LABEL_SAMPLE_SELECTION_2",
    },
  ],
  onComplete: jest.fn(),
};

jest.mock("i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("Markets: Lifecycle - Settle", () => {
  const renderButton = (props: any) =>
    render(<MarketLifecycleSettle {...props} />, {
      wrapper: AllTheProviders,
    });

  beforeAll(() => {
    matchMedia = new MatchMediaMock();
  });

  beforeEach(() => {
    cleanup();
    fetch.resetMocks();

    fetch.doMock(async (req) => {
      const body = await req.json();
      return Promise.resolve({
        body: JSON.stringify({
          settle: req.url.includes("/settle"),
          resettle: req.url.includes("/resettle"),
          ...body,
        }),
        status: 200,
      });
    });
  });

  afterEach(() => {
    fetch.mockRestore();
    matchMedia.clear();
    renderProps.onComplete.mockRestore();
  });

  test("Shouldn't display", async () => {
    await act(async () => {
      renderButton({
        ...renderProps,
        lifecycle: MarketLifecycleTypeEnum.NOT_BETTABLE,
      });
    });

    let result: any = true;
    try {
      result = await screen.findAllByRole("button");
    } catch (e) {
      result = false;
    }

    expect(result).toBeFalsy();
  });

  test("Should display settle", async () => {
    await act(async () => {
      renderButton({
        ...renderProps,
        lifecycle: MarketLifecycleTypeEnum.BETTABLE,
      });
    });

    const result = await screen.findByRole("button");

    expect(result).toBeTruthy();
    expect(result.textContent).toBe("LABEL_SETTLE");
  });

  test("Should display resettle", async () => {
    await act(async () => {
      renderButton({
        ...renderProps,
        lifecycle: MarketLifecycleTypeEnum.SETTLED,
      });
    });

    const result = await screen.findByRole("button");

    expect(result).toBeTruthy();
    expect(result.textContent).toBe("LABEL_RESETTLE");
  });

  describe("Open the modal, choose the selection", () => {
    const openModalAndTriggerAction = async (
      lifecycle: MarketLifecycleType,
      multiSelect = false,
    ) =>
      act(async () => {
        renderButton({
          ...renderProps,
          lifecycle,
        });

        const button = await screen.findByRole("button");

        act(() => {
          button.click();
        });

        const modal = await screen.findByRole("dialog");
        const selections = await screen.findByTestId("selection-dropdown");
        const reasonInput = document.getElementById("marketSettle_reason");
        const modalSubmitButton = await screen.findByTestId(
          "modal-footer-button-submit",
        );
        if (!reasonInput) {
          throw new Error("Expected settle reason input to be rendered");
        }
        fireEvent.change(reasonInput, { target: { value: "test" } });

        await act(async () => {
          fireEvent.mouseDown(selections?.firstElementChild as Element);
          await waitFor(() => screen.getByText("LABEL_SAMPLE_SELECTION"));
        });

        const selectionOption = await screen.getByText(
          "LABEL_SAMPLE_SELECTION",
        );

        act(() => {
          fireEvent.click(selectionOption);
        });

        if (multiSelect) {
          await act(async () => {
            fireEvent.mouseDown(selections?.firstElementChild as Element);
            await waitFor(() => screen.getByText("LABEL_SAMPLE_SELECTION_2"));
          });
          const secondSelectionOption = await screen.getByText(
            "LABEL_SAMPLE_SELECTION_2",
          );
          act(() => {
            fireEvent.click(secondSelectionOption);
          });
        }

        act(() => {
          modalSubmitButton.click();
        });

        expect(modal).toBeTruthy();
        expect(selections).toBeTruthy();
        expect(selectionOption).toBeTruthy();
        expect(modalSubmitButton).toBeTruthy();
      });

    test("Should trigger settle action", async () => {
      await openModalAndTriggerAction(MarketLifecycleTypeEnum.BETTABLE);

      const callResult = await first(fetch.mock.results)?.value;
      expect(fetch.mock.calls[0][0]).toBe(
        `${apiUrl}/admin/trading/markets/sample-id/lifecycle/settle`,
      );
      expect(await callResult.json()).toEqual({
        settle: true,
        resettle: false,
        winningSelectionIds: [first(renderProps.selections)?.selectionId],
        winningSelectionId: first(renderProps.selections)?.selectionId,
        reason: "test",
      });
    });

    test("Should trigger resettle action", async () => {
      await openModalAndTriggerAction(MarketLifecycleTypeEnum.SETTLED);

      const callResult = await first(fetch.mock.results)?.value;

      expect(fetch.mock.calls[0][0]).toBe(
        `${apiUrl}/admin/trading/markets/sample-id/lifecycle/resettle`,
      );
      expect(await callResult.json()).toEqual({
        settle: false,
        resettle: true,
        winningSelectionIds: [first(renderProps.selections)?.selectionId],
        winningSelectionId: first(renderProps.selections)?.selectionId,
        reason: "test",
      });
    });

    test("Should trigger settle action with multi-selection payload", async () => {
      await openModalAndTriggerAction(MarketLifecycleTypeEnum.BETTABLE, true);

      const callResult = await first(fetch.mock.results)?.value;
      expect(fetch.mock.calls[0][0]).toBe(
        `${apiUrl}/admin/trading/markets/sample-id/lifecycle/settle`,
      );
      expect(await callResult.json()).toEqual({
        settle: true,
        resettle: false,
        winningSelectionIds: [
          first(renderProps.selections)?.selectionId,
          renderProps.selections[1].selectionId,
        ],
        winningSelectionId: first(renderProps.selections)?.selectionId,
        reason: "test",
      });
    });
  });
});
