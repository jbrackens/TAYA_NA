import * as React from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import axios from "axios";
import "@testing-library/jest-dom/extend-expect";
import { configureStore, Store } from "@reduxjs/toolkit";
import { createMemoryHistory } from "history";
import { Route } from "react-router-dom";

import rootReducer, { RootState } from "../../redux/rootReducer";
import { Wrapper } from "../../test/Wrapper";
import { CampaignsPage } from "./CampaignsPage";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;
const history = createMemoryHistory({ initialEntries: ["/LD/campaigns"] });

describe("CampaignsPage", () => {
  let store: Store<RootState>;

  beforeEach(async () => {
    store = configureStore({ reducer: rootReducer });

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        campaigns: [
          {
            id: 815,
            brandId: "LD",
            name: "Best campaign 1 active",
            status: "active",
            startTime: "2020-04-30T06:00:00.000Z",
            endTime: "2020-04-30T08:45:00.000Z",
            audienceType: "static",
            creditMultiple: false,
            audience: "0",
            reactions: "0"
          },
          {
            id: 816,
            brandId: "LD",
            name: "Best campaign 2 active",
            status: "active",
            startTime: "2020-04-30T06:00:00.000Z",
            endTime: "2020-04-30T08:45:00.000Z",
            audienceType: "static",
            creditMultiple: false,
            audience: "0",
            reactions: "0"
          },
          {
            id: 817,
            brandId: "LD",
            name: "Best campaign 3 active",
            status: "active",
            startTime: "2020-04-30T06:00:00.000Z",
            endTime: "2020-04-30T08:45:00.000Z",
            audienceType: "static",
            creditMultiple: false,
            audience: "0",
            reactions: "0"
          }
        ]
      }
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("render campaigns page with right initial state", () => {
    const { getByText, getByPlaceholderText, getByTitle, getByTestId } = render(
      <Wrapper store={store}>
        <CampaignsPage />
      </Wrapper>
    );

    expect(getByPlaceholderText("Search")).toBeInTheDocument();
    expect(getByText("Active")).toBeInTheDocument();
    expect(getByText("Draft")).toBeInTheDocument();
    expect(getByText("Archive")).toBeInTheDocument();
    expect(getByTitle("Create new campaign")).toBeInTheDocument();
    expect(getByTestId("loader")).toBeInTheDocument();
  });

  it("should redirect to /campaigns/new when clicking on (+) button", () => {
    const { getByTitle } = render(
      <Wrapper history={history} store={store}>
        <Route path="/:brandId/campaigns">
          <CampaignsPage />
        </Route>
      </Wrapper>
    );

    const route = "/LD/campaigns/new";
    const button = getByTitle("Create new campaign");

    fireEvent.click(button);

    expect(history.location.pathname).toEqual(route);
  });

  it("should display campaigns", async () => {
    const { getByText } = render(
      <Wrapper store={store}>
        <CampaignsPage />
      </Wrapper>
    );

    // expect(getByText("Best campaign 1 active")).toBeInTheDocument();
    // expect(getByText("Best campaign 2 active")).toBeInTheDocument();
    // expect(getByText("Best campaign 3 active")).toBeInTheDocument();
  });
});
