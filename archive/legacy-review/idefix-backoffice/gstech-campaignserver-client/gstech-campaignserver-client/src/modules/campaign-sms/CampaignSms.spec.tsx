import * as React from "react";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { configureStore, Store } from "@reduxjs/toolkit";
import debounce from "lodash/debounce";
import axios from "axios";
import { ExistingCampaign, Sms } from "app/types";

import { fetchCampaign } from "../campaign-info";
import { Wrapper } from "../../test";
import { CampaignSms } from "./CampaignSms";
import rootReducer, { RootState } from "../../redux/rootReducer";
import { fetchBrandSettings } from "../app";

jest.mock("axios");
jest.mock("lodash/debounce", () => jest.fn(fn => fn));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("sms -> sms edit", () => {
  let store: Store<RootState>;

  const campaignInfo: ExistingCampaign = {
    audienceType: "static",
    creditMultiple: false,
    brandId: "LD",
    endTime: null,
    startTime: null,
    id: 1,
    name: "CampaName",
    status: "draft",
    email: null,
    sms: null,
    notification: null,
    banner: null,
    previewMode: false,
    audience: {
      rules: []
    },
    reward: {
      rewards: []
    }
  };
  const smses: Sms[] = [
    {
      id: 1234,
      name: "20200218-DETake5",
      text: "Wie wäre es mit ein paar Freispielen für den Gamomat Slot Take 5?"
    },
    {
      id: 4321,
      name: "20200218-DETake6",
      text: "Wie wäre es mit ein paar Freispielen für den Gamomat Slot Take 6?"
    },
    {
      id: 2314,
      name: "20200218-DETake7",
      text: "Wie wäre es mit ein paar Freispielen für den Gamomat Slot Take 7?"
    }
  ];

  beforeEach(async () => {
    store = configureStore({ reducer: rootReducer });

    // @ts-ignore
    debounce.mockImplementation(fn => fn);

    mockedAxios.get.mockResolvedValueOnce({ data: { data: campaignInfo } });
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: {
          campaignContentId: 0
        }
      }
    });
    mockedAxios.put.mockResolvedValueOnce({
      data: {
        data: {
          ok: true
        }
      }
    });
    mockedAxios.delete.mockResolvedValueOnce({
      data: {
        data: {
          ok: true
        }
      }
    });

    store.dispatch(
      fetchBrandSettings.fulfilled(
        {
          countries: [],
          languages: [],
          emails: [],
          tags: [],
          segments: [],
          smses,
          notifications: [],
          thumbnails: []
        },
        "",
        ""
      )
    );
    await store.dispatch<any>(fetchCampaign(1));
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("should render with right initial state", () => {
    const { getByText } = render(
      <Wrapper store={store}>
        <CampaignSms isEditable={true} />
      </Wrapper>
    );

    expect(getByText("SMS")).toBeInTheDocument();
    expect(getByText("Download CSV")).toBeInTheDocument();
  });

  it("should send request to create/update/delete an sms", async () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <Wrapper store={store}>
        <CampaignSms isEditable={true} />
      </Wrapper>
    );

    const searchField = getByPlaceholderText("Search by name");

    // create sms
    fireEvent.click(searchField);
    fireEvent.change(searchField, { target: { value: "DETake5" } });
    expect(getByText("20200218-DETake5")).toBeInTheDocument();

    await waitFor(() => {
      fireEvent.click(getByText("20200218-DETake5"));
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith("/api/v1/campaigns/1/content", { contentId: 1234, sendToAll: false });
    expect(getByText("Wie wäre es mit ein paar Freispielen für den Gamomat Slot Take 5?")).toBeInTheDocument();

    // update sms
    fireEvent.click(searchField);
    fireEvent.change(searchField, { target: { value: "DETake6" } });
    expect(getByText("20200218-DETake6")).toBeInTheDocument();

    await waitFor(() => {
      fireEvent.click(getByText("20200218-DETake6"));
    });

    expect(mockedAxios.put).toHaveBeenCalledTimes(1);
    expect(mockedAxios.put).toHaveBeenCalledWith("/api/v1/campaigns/1/content/0", {
      contentId: 4321,
      sendToAll: false
    });
    expect(getByText("Wie wäre es mit ein paar Freispielen für den Gamomat Slot Take 6?")).toBeInTheDocument();

    fireEvent.click(searchField);
    fireEvent.change(searchField, { target: { value: "DETake7" } });
    expect(getByText("20200218-DETake7")).toBeInTheDocument();

    await waitFor(() => {
      fireEvent.click(getByText("20200218-DETake7"));
    });

    expect(mockedAxios.put).toHaveBeenCalledTimes(2);
    expect(mockedAxios.put).toHaveBeenCalledWith("/api/v1/campaigns/1/content/0", {
      contentId: 2314,
      sendToAll: false
    });
    expect(getByText("Wie wäre es mit ein paar Freispielen für den Gamomat Slot Take 7?")).toBeInTheDocument();

    // remove sms
    await waitFor(() => {
      fireEvent.click(getByTestId("delete-button"));
    });

    expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
    expect(mockedAxios.delete).toHaveBeenCalledWith("/api/v1/campaigns/1/content/0");
  });
});
