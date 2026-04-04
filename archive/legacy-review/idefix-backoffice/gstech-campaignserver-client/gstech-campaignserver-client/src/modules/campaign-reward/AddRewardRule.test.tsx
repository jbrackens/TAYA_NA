import * as React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { Store, configureStore } from "@reduxjs/toolkit";
import axios from "axios";
import { createMemoryHistory } from "history";
import { Route } from "react-router-dom";

import AddRewardRule from "./AddRewardRule";
import { Wrapper, campaignInfoPayload } from "../../test";
import rootReducer, { RootState } from "../../redux/rootReducer";
import { fetchCampaign } from "../campaign-info";
import { fetchRewards } from "../rewards";
import { fetchBrandSettings, fetchSettings } from "../app";

const drawerRoot = document.createElement("div");
drawerRoot.setAttribute("id", "drawer-root");
document.body.appendChild(drawerRoot);

const history = createMemoryHistory({ initialEntries: ["/LD/campaigns"] });
const path = "/:brandId/campaigns";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Campaign Reward -> AddRewardRule Drawer", () => {
  let store: Store<RootState>;
  const onClose = jest.fn();

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    store = configureStore({ reducer: rootReducer });
    mockedAxios.get.mockResolvedValueOnce(campaignInfoPayload).mockResolvedValueOnce({
      data: {
        data: [
          {
            id: "bonus-id",
            description: "kasinosankarit_neonstaxx_10ss"
          },
          {
            id: "bonus-id2",
            description: "kasinosankarit_neonstaxx_20ss"
          }
        ]
      }
    });

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: {
          rewardRuleId: 111
        }
      }
    });

    await store.dispatch<any>(fetchCampaign(91));
    await store.dispatch<any>(fetchRewards({ brandId: "LD", rewardType: "extraReward" }));

    await store.dispatch(
      fetchSettings.fulfilled(
        {
          brands: [
            {
              id: "CJ",
              name: "CasinoJEFE"
            },
            {
              id: "KK",
              name: "Kalevala Kasino"
            },
            {
              id: "LD",
              name: "LuckyDino"
            },
            {
              id: "OS",
              name: "OlaSpill"
            }
          ],
          rewardTriggers: ["deposit", "login", "registration", "instant"],
          campaigns: [],
          bannerLocations: {},
          contentConfig: {},
          rewardConfig: {
            rewardDefinitions: {
              LD: [
                {
                  id: 91,
                  name: "Campaign Rewards",
                  type: "extraReward",
                  spinTypes: ["normal", "super", "mega"],
                  table: [],
                  fields: []
                }
              ]
            },
            thumbnails: {}
          }
        },
        ""
      )
    );
    await store.dispatch(
      fetchBrandSettings.fulfilled(
        {
          countries: [],
          languages: [
            { code: "en", longCode: "ENG", name: "English", engName: "English" },
            {
              code: "fi",
              longCode: "FIN",
              name: "Suomi",
              engName: "Finnish"
            }
          ],
          emails: [],
          smses: [],
          notifications: [],
          tags: [],
          segments: [],
          thumbnails: []
        },
        "",
        ""
      )
    );
  });

  it("render add reward drawer with right initial state", () => {
    const { container, getByText, getByDisplayValue, getByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <AddRewardRule onClose={jest.fn()} />
        </Route>
      </Wrapper>
    );

    expect(getByText("Add New Reward")).toBeInTheDocument();
    expect(getByText("Cancel")).toBeInTheDocument();
    expect(getByText("Add Reward")).toBeInTheDocument();
    expect(getByText("Reward Title")).toBeInTheDocument();
    expect(getByText("EN")).toBeInTheDocument();
    expect(getByText("FI")).toBeInTheDocument();
    expect(getByText("Trigger")).toBeInTheDocument();
    expect((getByDisplayValue("Deposit") as HTMLSelectElement).value).toBe("deposit");
    expect(getByText("(optional)")).toBeInTheDocument();
    expect(container.querySelector('input[name="minDeposit"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="maxDeposit"]')).toBeInTheDocument();
    expect(getByText("Number of rewards credited")).toBeInTheDocument();
    expect(container.querySelector('input[name="quantity"]')).toBeInTheDocument();
    expect(getByText("Wagering requirement")).toBeInTheDocument();
    expect(container.querySelector('input[name="wager"]')).toBeInTheDocument();
    expect(getByTestId("type-select")).toBeInTheDocument();
    expect(getByTestId("reward-search")).toBeInTheDocument();
  });

  it("should close add reward dialog on cancel button click", () => {
    const { getByText } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <AddRewardRule onClose={onClose} />
        </Route>
      </Wrapper>
    );

    expect(onClose).toHaveBeenCalledTimes(0);
    fireEvent.click(getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should change titles", () => {
    const { container } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <AddRewardRule onClose={onClose} />
        </Route>
      </Wrapper>
    );

    const fiTitle = container.querySelector('input[name="titles.fi.text"]');
    const enTitle = container.querySelector('input[name="titles.en.text"]');

    expect(fiTitle).toHaveValue("");
    expect(enTitle).toHaveValue("");

    fireEvent.change(fiTitle!, { target: { value: "title fi" } });
    fireEvent.change(enTitle!, { target: { value: "title en" } });

    expect(fiTitle).toHaveValue("title fi");
    expect(enTitle).toHaveValue("title en");
  });

  it("should enable to change trigger", () => {
    const container = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <AddRewardRule onClose={onClose} />
        </Route>
      </Wrapper>
    );

    fireEvent.change(container.getByDisplayValue("Deposit"), { target: { value: "login" } });

    expect((container.getByDisplayValue("Login") as HTMLSelectElement).value).toBe("login");
  });

  it("should display right select for initial LD brand", async () => {
    const { container } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <AddRewardRule onClose={onClose} />
        </Route>
      </Wrapper>
    );

    expect(container.querySelector('option[value="extraReward"]')).toBeInTheDocument();
  });

  it("should render right fields if trigger was changed", () => {
    const container = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <AddRewardRule onClose={onClose} />
        </Route>
      </Wrapper>
    );

    expect((container.getByDisplayValue("Deposit") as HTMLSelectElement).value).toBe("deposit");
    expect(container.queryByTestId("deposit-range")).toBeInTheDocument();
    expect(container.getByPlaceholderText("MIN")).toBeInTheDocument();
    expect(container.getByPlaceholderText("MAX")).toBeInTheDocument();

    fireEvent.change(container.getByDisplayValue("Deposit"), { target: { value: "login" } });

    expect((container.getByDisplayValue("Login") as HTMLSelectElement).value).toBe("login");

    expect(container.queryByTestId("deposit-range")).toBeNull();

    fireEvent.change(container.getByDisplayValue("Login"), { target: { value: "registration" } });

    expect((container.getByDisplayValue("Registration") as HTMLSelectElement).value).toBe("registration");

    expect(container.queryByTestId("deposit-range")).toBeNull();
  });

  it("should rewards credited and wager fields was changed", () => {
    const { container } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <AddRewardRule onClose={onClose} />
        </Route>
      </Wrapper>
    );

    const rewardsCredited = container.querySelector('input[name="quantity"]');
    const wagering = container.querySelector('input[name="wager"]');

    fireEvent.change(rewardsCredited!, { target: { value: "1" } });
    fireEvent.change(wagering!, { target: { value: "2" } });

    expect((rewardsCredited as HTMLSelectElement).value).toBe("1");
    expect((wagering as HTMLSelectElement).value).toBe("2");
  });

  it("shouldn't apply text values in numeric fields", () => {
    const { container } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <AddRewardRule onClose={onClose} />
        </Route>
      </Wrapper>
    );

    const minDeposit = container.querySelector('input[name="minDeposit"]');
    const maxDeposit = container.querySelector('input[name="maxDeposit"]');

    const rewardsCredited = container.querySelector('input[name="quantity"]');
    const wagering = container.querySelector('input[name="wager"]');

    fireEvent.change(minDeposit!, { target: { value: "some text" } });
    fireEvent.change(maxDeposit!, { target: { value: "some text" } });
    fireEvent.change(rewardsCredited!, { target: { value: "some text" } });
    fireEvent.change(wagering!, { target: { value: "some text" } });

    expect((minDeposit as HTMLSelectElement).value).toBe("");
    expect((maxDeposit as HTMLSelectElement).value).toBe("");
    expect((rewardsCredited as HTMLSelectElement).value).toBe("");
    expect((wagering as HTMLSelectElement).value).toBe("");
  });

  it("should display search results window by click", () => {
    const { container, getByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <AddRewardRule onClose={onClose} />
        </Route>
      </Wrapper>
    );

    const search = getByTestId("reward-search");
    expect(search).toBeInTheDocument();

    fireEvent.click(search!);

    expect(container.querySelector('div[class="search__results"]')).toBeInTheDocument();
  });

  it("should form submit", async () => {
    const { container, getByText, getByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <AddRewardRule onClose={onClose} />
        </Route>
      </Wrapper>
    );

    const search = getByTestId("reward-search");

    fireEvent.change(search!, { target: { value: "bonus-id" } });

    expect(mockedAxios.post).toHaveBeenCalledTimes(0);

    fireEvent.change(container.querySelector('select[name="trigger"]')!, { target: { value: "login" } });
    fireEvent.change(container.querySelector('input[name="quantity"]')!, { target: { value: "1" } });

    fireEvent.click(getByText("Add Reward"));

    // expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    // expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should not allow submit", async () => {
    const { container, getByText } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <AddRewardRule onClose={onClose} />
        </Route>
      </Wrapper>
    );

    const trigger = container.querySelector('select[name="trigger"]') as HTMLSelectElement;
    const minDeposit = container.querySelector('input[name="minDeposit"]') as HTMLInputElement;
    const rewardsCredited = container.querySelector('input[name="quantity"]') as HTMLInputElement;
    const wagering = container.querySelector('input[name="wager"]') as HTMLInputElement;
    const addRewardButton = getByText("Add Reward") as HTMLButtonElement;

    expect(trigger.value).toBe("deposit");
    expect(minDeposit.value).toBe("");
    expect(rewardsCredited.value).toBe("1");
    expect(wagering.value).toBe("5");
    expect(addRewardButton.disabled).toBe(true);

    fireEvent.change(trigger, { target: { value: "login" } });

    expect(trigger.value).toBe("login");
    expect(addRewardButton.disabled).toBe(false);

    fireEvent.change(trigger, { target: { value: "registration" } });

    expect(trigger.value).toBe("registration");
    expect(addRewardButton.disabled).toBe(false);

    fireEvent.change(trigger, { target: { value: "instant" } });

    expect(trigger.value).toBe("instant");
    expect(addRewardButton.disabled).toBe(false);
  });
});
