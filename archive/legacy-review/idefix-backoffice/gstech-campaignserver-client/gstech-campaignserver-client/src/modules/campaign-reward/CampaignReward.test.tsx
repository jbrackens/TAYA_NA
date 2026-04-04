import * as React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { configureStore, Store } from "@reduxjs/toolkit";
import axios from "axios";
import { createMemoryHistory } from "history";

import { fetchCampaign } from "../campaign-info";
import { Wrapper, campaignInfoPayload } from "../../test";
import rootReducer, { RootState } from "../../redux/rootReducer";
import { CampaignReward } from "./CampaignReward";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("CampaignReward -> CampaignRewardEdit", () => {
  let store: Store<RootState>;

  beforeEach(async () => {
    store = configureStore({ reducer: rootReducer });
    mockedAxios.get.mockResolvedValueOnce(campaignInfoPayload);
    await store.dispatch<any>(fetchCampaign(91));
    mockedAxios.post.mockResolvedValue({ data: { rewardRuleId: 235 } });
    mockedAxios.delete.mockResolvedValue({ data: { ok: true } });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("should render component with right initial state", async () => {
    const { getByText, getByTestId } = render(
      <Wrapper store={store}>
        <CampaignReward isEditable={true} />
      </Wrapper>
    );

    expect(getByTestId("credit-multiple")).toBeInTheDocument();
    expect(getByTestId("dropdown-button")).toBeInTheDocument();
    expect(getByText("Trigger")).toBeInTheDocument();
    expect(getByText("Login")).toBeInTheDocument();
    expect(getByText("Credit")).toBeInTheDocument();
    expect(getByText("Add reward")).toBeInTheDocument();
  });

  it("should card remove by click on delete button", async () => {
    const { getByTestId, getByText, container } = render(
      <Wrapper store={store}>
        <CampaignReward isEditable={true} />
      </Wrapper>
    );

    expect(mockedAxios.delete).toHaveBeenCalledTimes(0);
    expect(container.querySelector("div.reward-rule__card")).toBeInTheDocument();
    fireEvent.click(getByTestId("dropdown-button"));
    fireEvent.click(getByText("Remove"));
    expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
    // expect(container.querySelector("div.reward-rule__card")).toBeNull();
  });

  it("should add reward drawer component by click on button", async () => {
    const history = createMemoryHistory();
    const { getByTestId } = render(
      <Wrapper store={store} history={history}>
        <CampaignReward isEditable={true} />
      </Wrapper>
    );

    // open drawer with email preview
    const drawerRoot = document.createElement("div");
    drawerRoot.setAttribute("id", "drawer-root");
    document.body.appendChild(drawerRoot);

    expect(history.location.search).toBe("");
    fireEvent.click(getByTestId("add-button"));
    expect(history.location.search).toBe("?drawer=add-reward-rule");
  });
});

describe("CampaignReward -> CampaignRewardDetails", () => {
  let store: Store<RootState>;

  beforeEach(async () => {
    store = configureStore({ reducer: rootReducer });
    mockedAxios.get.mockResolvedValueOnce(campaignInfoPayload);
    await store.dispatch<any>(fetchCampaign(91));
    mockedAxios.post.mockResolvedValue({ data: { rewardRuleId: 235 } });
    mockedAxios.delete.mockResolvedValue({ data: { ok: true } });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("should render component with right initial state", async () => {
    const { getByText, queryByText, getByTestId, queryByTestId, container } = render(
      <Wrapper store={store}>
        <CampaignReward isEditable={false} />
      </Wrapper>
    );

    expect(container.querySelector("div.reward-rule__card")).toBeInTheDocument();
    expect(getByTestId("credit-multiple")).toBeInTheDocument();
    expect(queryByTestId("dropdown-button")).toBeNull();
    expect(getByText("Trigger")).toBeInTheDocument();
    expect(getByText("Login")).toBeInTheDocument();
    expect(getByText("Credit")).toBeInTheDocument();
    expect(queryByText("Add reward")).toBeNull();
  });
});
