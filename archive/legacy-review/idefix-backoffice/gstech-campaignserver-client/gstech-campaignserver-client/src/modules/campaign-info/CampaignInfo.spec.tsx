import * as React from "react";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { Route } from "react-router-dom";
import axios from "axios";
import debounce from "lodash/debounce";
import "@testing-library/jest-dom/extend-expect";
import { createMemoryHistory } from "history";
import { configureStore, Store } from "@reduxjs/toolkit";

import rootReducer, { RootState } from "../../redux/rootReducer";
import { fetchCampaign } from "./campaignInfoSlice";
import { Wrapper } from "../../test/Wrapper";
import { CampaignInfo } from "./CampaignInfo";

jest.mock("axios");
jest.mock("lodash/debounce", () => jest.fn(fn => fn));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const history = createMemoryHistory({ initialEntries: ["/LD/campaigns"] });
const path = "/:brandId/campaigns";

describe("EditCampaignInfo", () => {
  let store: Store<RootState>;

  beforeEach(async () => {
    store = configureStore({ reducer: rootReducer });

    // @ts-ignore
    debounce.mockImplementation(fn => fn);

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          audience: { rules: [] },
          audienceType: "static",
          creditMultiple: false,
          brandId: "LD",
          email: null,
          endTime: null,
          id: 810,
          name: "N",
          notification: null,
          reward: { rewards: [] },
          sms: null,
          startTime: null,
          status: "draft",
          groupId: 1,
          group: { name: "testGroup", campaigns: [{ id: 1, name: "test" }] }
        }
      }
    });

    await store.dispatch<any>(fetchCampaign(810));
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("should render module with components: back-button, title-text, start/end time", async () => {
    const { getByTestId, getByText, getAllByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignInfo isEditable={true} />
        </Route>
      </Wrapper>
    );

    expect(getByTestId("back-button")).toBeInTheDocument();
    expect(getByText("Campaign Name")).toBeInTheDocument();
    expect(getByText("Start time")).toBeInTheDocument();
    expect(getByText("End time")).toBeInTheDocument();
    expect(getAllByTestId("date-picker-input")[0]).toBeInTheDocument();
    expect(getAllByTestId("date-picker-input")[1]).toBeInTheDocument();
  });

  it("should redirect to /campaigns when click on backButton", () => {
    const { getByTestId } = render(
      <Wrapper history={history} store={store}>
        <Route path={path}>
          <CampaignInfo isEditable={true} />
        </Route>
      </Wrapper>
    );
    const backButton = getByTestId("back-button");
    const route = "/LD/campaigns";

    fireEvent.click(backButton);

    expect(history.location.pathname).toEqual(route);
  });

  it("should display value when typing on group name", () => {
    const { getByPlaceholderText } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignInfo isEditable={true} />
        </Route>
      </Wrapper>
    );

    const groupName = getByPlaceholderText("Group Name");

    fireEvent.change(groupName, { target: { value: "test value" } });

    expect(groupName).toHaveValue("test value");
  });

  it("should display selected value date/time in startTime inputs", async () => {
    const { getAllByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignInfo isEditable={true} />
        </Route>
      </Wrapper>
    );

    const datePicker = getAllByTestId("date-picker-input")[0];

    fireEvent.change(datePicker, { target: { value: new Date(2023, 5, 10) } });
    expect(datePicker).toHaveValue("10.06.2023");
    expect(datePicker).toHaveValue("10.06.2023");
  });

  it("should display selected value date/time in endTime inputs", async () => {
    const { getAllByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignInfo isEditable={true} />
        </Route>
      </Wrapper>
    );

    const datePicker = getAllByTestId("date-picker-input")[1];

    fireEvent.change(datePicker, { target: { value: new Date(2023, 5, 11) } });
    expect(datePicker).toHaveValue("11.06.2023");
    expect(datePicker).toHaveValue("11.06.2023");
  });

  it("should send request to server for updating of the campaign after delay when group name was changed", async () => {
    const { getByPlaceholderText } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignInfo isEditable={true} />
        </Route>
      </Wrapper>
    );

    const groupName = getByPlaceholderText("Group Name");

    mockedAxios.put.mockResolvedValueOnce({ data: { data: { ok: true } } });

    fireEvent.change(groupName, { target: { value: "New group" } });

    await waitFor(() => {
      expect(mockedAxios.put).toBeCalled();
      expect(mockedAxios.put).toHaveBeenCalledWith("/api/v1/campaign-groups/1", {
        name: "New group"
      });
    });
  });
});
