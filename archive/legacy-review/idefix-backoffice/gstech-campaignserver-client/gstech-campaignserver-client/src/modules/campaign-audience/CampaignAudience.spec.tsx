import * as React from "react";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";
import axios from "axios";
import debounce from "lodash/debounce";
import { createMemoryHistory } from "history";
import { Route } from "react-router-dom";
import { Country, Language } from "app/types";

import { CampaignAudience } from "./CampaignAudience";
import { Wrapper } from "../../test";
import { configureStore, Store } from "@reduxjs/toolkit";
import rootReducer, { RootState } from "../../redux/rootReducer";
import { fetchCampaign } from "../campaign-info";
import { fetchBrandSettings, fetchSettings } from "../app";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;
const history = createMemoryHistory({ initialEntries: ["/LD/campaigns"] });
const path = "/:brandId/campaigns";

jest.mock("lodash/debounce", () => jest.fn(fn => fn));

describe("CampaignAudience", () => {
  let store: Store<RootState>;

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    store = configureStore({ reducer: rootReducer });

    // @ts-ignore
    debounce.mockImplementation(fn => fn);

    const existingCampaign = {
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
      status: "draft"
    };

    const countries: Country[] = [
      {
        brandId: "KK",
        code: "BY",
        name: "Belarus"
      },
      {
        brandId: "KK",
        code: "EE",
        name: "Estonia"
      }
    ];

    const languages: Language[] = [
      {
        code: "en",
        longCode: "ENG",
        name: "English",
        engName: "English"
      },
      {
        code: "fi",
        longCode: "FIN",
        name: "Suomi",
        engName: "Finnish"
      }
    ];

    await store.dispatch(
      fetchSettings.fulfilled(
        {
          brands: [],
          rewardTriggers: ["deposit", "login", "registration", "instant"],
          campaigns: [],
          rewardConfig: {
            rewardDefinitions: {},
            thumbnails: {}
          },
          contentConfig: {},
          bannerLocations: {}
        },
        ""
      )
    );

    store.dispatch(
      fetchBrandSettings.fulfilled(
        {
          countries,
          languages,
          tags: ["some tag"],
          segments: ["some segment"],
          emails: [],
          smses: [],
          notifications: [],
          thumbnails: []
        },
        "",
        ""
      )
    );

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: existingCampaign
      }
    });

    await store.dispatch<any>(fetchCampaign(810));

    const responsePayload = {
      data: {
        audienceRuleId: 95
      }
    };

    mockedAxios.post.mockResolvedValue({ data: responsePayload });
    mockedAxios.put.mockResolvedValue({ data: { data: existingCampaign } });
    mockedAxios.delete.mockResolvedValue({ data: { data: { ok: true } } });
  });

  it("render without errors", () => {
    const { getByText } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable />
        </Route>
      </Wrapper>
    );
  });

  it("open dropdown with rules by click on addRule button", async () => {
    const { queryByText, getByText } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable />
        </Route>
      </Wrapper>
    );

    expect(queryByText("Number of deposits")).toBeNull();
    expect(queryByText(/country/i)).toBeNull();
    expect(queryByText(/language/i)).toBeNull();
    expect(queryByText(/registration date/i)).toBeNull();
    expect(queryByText(/deposit date/i)).toBeNull();
    expect(queryByText(/last login date/i)).toBeNull();
    expect(queryByText(/tags/i)).toBeNull();
    expect(queryByText(/segments/i)).toBeNull();
    expect(queryByText(/Received reward from other campaign/i)).toBeNull();
    expect(queryByText(/Deposited on campaign/i)).toBeNull();

    await waitFor(() => {
      fireEvent.click(getByText("Add rule"));
    });

    expect(getByText(/number of deposits/i)).toBeInTheDocument();
    expect(getByText(/country/i)).toBeInTheDocument();
    expect(getByText(/language/i)).toBeInTheDocument();
    expect(getByText(/registration date/i)).toBeInTheDocument();
    expect(getByText(/deposit date/i)).toBeInTheDocument();
    expect(getByText(/last login date/i)).toBeInTheDocument();
    expect(getByText(/tags/i)).toBeInTheDocument();
    expect(getByText(/segments/i)).toBeInTheDocument();
    expect(getByText(/Received reward from other campaign/i)).toBeInTheDocument();
    expect(getByText(/Deposited on campaign/i)).toBeInTheDocument();
  });

  it("add number of deposits rule on click by dropdown menu item - number of deposits", async () => {
    const { getByText, getByRole, getByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable />
        </Route>
      </Wrapper>
    );

    await waitFor(() => {
      fireEvent.click(getByText("Add rule"));
      fireEvent.click(getByText("Number of deposits"));
    });

    expect(getByText("is")).toBeInTheDocument();
    expect(getByText("not")).toBeInTheDocument();
    expect(getByText("at least")).toBeInTheDocument();
    expect(getByText("between")).toBeInTheDocument();
    expect(getByRole("textbox")).toHaveAttribute("name", "values");
    expect(getByRole("textbox")).toHaveAttribute("value", "1");
    expect(getByTestId("delete-button")).toBeInTheDocument();
  });

  it("add country rule on click by dropdown menu item - country", async () => {
    const { getByText, getByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable />
        </Route>
      </Wrapper>
    );

    await waitFor(() => {
      fireEvent.click(getByText("Add rule"));
      fireEvent.click(getByText(/country/i));
    });

    expect(getByText("is")).toBeInTheDocument();
    expect(getByText("not")).toBeInTheDocument();
    expect(getByText(/add country/i)).toBeInTheDocument();
    expect(getByTestId("delete-button")).toBeInTheDocument();
  });

  it("add language rule on click by dropdown menu item - language", async () => {
    const { getByText, getByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable />
        </Route>
      </Wrapper>
    );

    await waitFor(() => {
      fireEvent.click(getByText("Add rule"));
      fireEvent.click(getByText(/language/i));
    });

    expect(getByText("is")).toBeInTheDocument();
    expect(getByText("not")).toBeInTheDocument();
    expect(getByText(/add language/i)).toBeInTheDocument();
    expect(getByTestId("delete-button")).toBeInTheDocument();
  });

  it("add segments rule on click by dropdown menu item - segments", async () => {
    const { getByText, getByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable />
        </Route>
      </Wrapper>
    );

    await waitFor(() => {
      fireEvent.click(getByText("Add rule"));
      fireEvent.click(getByText(/segments/i));
    });

    expect(getByText("is")).toBeInTheDocument();
    expect(getByText("not")).toBeInTheDocument();
    expect(getByText(/add segment/i)).toBeInTheDocument();
    expect(getByTestId("delete-button")).toBeInTheDocument();
  });

  it("add deposit date rule on click by dropdown menu item - deposit date", async () => {
    const { getByText, getByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable />
        </Route>
      </Wrapper>
    );

    await waitFor(() => {
      fireEvent.click(getByText("Add rule"));
      fireEvent.click(getByText(/deposit date/i));
    });

    expect(getByText(/deposit date/i)).toBeInTheDocument();
    expect(getByText("is")).toBeInTheDocument();
    expect(getByText("not")).toBeInTheDocument();
    expect(getByText("between")).toBeInTheDocument();
    expect(getByText("within")).toBeInTheDocument();
    expect(getByTestId("delete-button")).toBeInTheDocument();
  });

  it("add last login date rule on click by dropdown menu item - deposit date", async () => {
    const { getByText, getByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable />
        </Route>
      </Wrapper>
    );

    await waitFor(() => {
      fireEvent.click(getByText("Add rule"));
      fireEvent.click(getByText(/last login date/i));
    });

    expect(getByText(/last login date/i)).toBeInTheDocument();
    expect(getByText("is")).toBeInTheDocument();
    expect(getByText("not")).toBeInTheDocument();
    expect(getByText("at most")).toBeInTheDocument();
    expect(getByText("equal to")).toBeInTheDocument();
    expect(getByText("at least")).toBeInTheDocument();
    expect(getByText("between")).toBeInTheDocument();
    expect(getByTestId("date-picker-input")).toBeInTheDocument();
    expect(getByTestId("delete-button")).toBeInTheDocument();
  });

  it("create country rule on server part, update and delete", async () => {
    const { getByText, getByTestId, queryByTestId, container } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable />
        </Route>
      </Wrapper>
    );

    fireEvent.click(getByText("Add rule"));
    fireEvent.click(getByText(/country/i));

    await waitFor(() => {
      fireEvent.keyDown(getByText("Add country"), { key: "ArrowDown" });
    });
    fireEvent.click(getByText("Belarus"));

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith("/api/v1/campaigns/810/audience-rules", {
        name: "country",
        not: false,
        operator: "in",
        values: []
      });
      expect(container.querySelector('input[value="BY"]')).toBeInTheDocument();
    });

    fireEvent.keyDown(getByText("Belarus"), { key: "ArrowDown" });

    fireEvent.click(getByText("Estonia"));
    expect(mockedAxios.put).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledTimes(2);
      expect(container.querySelector('input[value="BY"]')).toBeInTheDocument();
      expect(container.querySelector('input[value="EE"]')).toBeInTheDocument();
      expect(mockedAxios.put).toHaveBeenCalledWith("/api/v1/campaigns/810/audience-rules/95", {
        name: "country",
        not: false,
        operator: "in",
        values: ["BY", "EE"]
      });
    });

    expect(queryByTestId("loader")).toBeNull();
    fireEvent.click(getByTestId("delete-button"));
    expect(getByTestId("loader")).toBeInTheDocument();

    await waitFor(() => {
      expect(queryByTestId("loader")).toBeNull();
      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
      expect(mockedAxios.delete).toHaveBeenCalledWith("/api/v1/campaigns/810/audience-rules/95");
    });
  });

  it("create language rule on server part, update and delete", async () => {
    const { getByText, getByTestId, queryByTestId, container } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable />
        </Route>
      </Wrapper>
    );

    fireEvent.click(getByText("Add rule"));
    fireEvent.click(getByText(/language/i));

    await waitFor(() => {
      fireEvent.keyDown(getByText("Add language"), { key: "ArrowDown" });
    });
    fireEvent.click(getByText("English"));

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith("/api/v1/campaigns/810/audience-rules", {
        name: "language",
        not: false,
        operator: "in",
        values: []
      });
      expect(container.querySelector('input[value="en"]')).toBeInTheDocument();
    });

    fireEvent.keyDown(getByText("English"), { key: "ArrowDown" });

    fireEvent.click(getByText("Finnish"));
    expect(mockedAxios.put).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledTimes(2);
      expect(container.querySelector('input[value="fi"]')).toBeInTheDocument();
      expect(mockedAxios.put).toHaveBeenCalledWith("/api/v1/campaigns/810/audience-rules/95", {
        name: "language",
        not: false,
        operator: "in",
        values: ["en", "fi"]
      });
    });

    expect(queryByTestId("loader")).toBeNull();
    fireEvent.click(getByTestId("delete-button"));
    expect(getByTestId("loader")).toBeInTheDocument();

    await waitFor(() => {
      expect(queryByTestId("loader")).toBeNull();
      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
      expect(mockedAxios.delete).toHaveBeenCalledWith("/api/v1/campaigns/810/audience-rules/95");
    });
  });

  it("create segments rule on server part, update and delete", async () => {
    const { getByText, getByTestId, queryByTestId, container } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable />
        </Route>
      </Wrapper>
    );

    fireEvent.click(getByText("Add rule"));
    fireEvent.click(getByText(/segments/i));

    await waitFor(() => {
      fireEvent.keyDown(getByText("Add segment"), { key: "ArrowDown" });
    });
    fireEvent.click(getByText("some segment"));

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith("/api/v1/campaigns/810/audience-rules", {
        name: "segments",
        not: false,
        operator: "in",
        values: []
      });
      expect(container.querySelector('input[value=""]')).toBeInTheDocument();
    });

    const input = container.querySelector('input[tabindex="0"]');

    // create new select option

    fireEvent.change(input!, {
      target: { value: "new segment" }
    });

    fireEvent.click(getByText('Create "new segment"'));

    expect(mockedAxios.put).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledTimes(2);
      expect(container.querySelector('input[value="new segment"]')).toBeInTheDocument();
      expect(mockedAxios.put).toHaveBeenCalledWith("/api/v1/campaigns/810/audience-rules/95", {
        name: "segments",
        not: false,
        operator: "in",
        values: ["some segment", "new segment"]
      });
    });

    expect(queryByTestId("loader")).toBeNull();
    fireEvent.click(getByTestId("delete-button"));
    expect(getByTestId("loader")).toBeInTheDocument();

    await waitFor(() => {
      expect(queryByTestId("loader")).toBeNull();
      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
      expect(mockedAxios.delete).toHaveBeenCalledWith("/api/v1/campaigns/810/audience-rules/95");
    });
  });

  it("create tags rule on server part, update and delete", async () => {
    const { getByText, getByTestId, queryByTestId, container } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable />
        </Route>
      </Wrapper>
    );

    await waitFor(() => {
      fireEvent.click(getByText("Add rule"));
    });

    await waitFor(() => {
      fireEvent.click(getByText(/tags/i));
    });

    await waitFor(() => {
      fireEvent.keyDown(getByText("Add tag"), { key: "ArrowDown" });
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith("/api/v1/campaigns/810/audience-rules", {
        name: "tags",
        not: false,
        operator: "in",
        values: []
      });
      expect(container.querySelector('input[value=""]')).toBeInTheDocument();
    });

    const input = container.querySelector('input[tabindex="0"]');

    // create new tag option

    fireEvent.change(input!, {
      target: { value: "new tag" }
    });

    fireEvent.click(getByText('Create "new tag"'));

    expect(mockedAxios.put).toHaveBeenCalledTimes(0);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledTimes(1);
      expect(container.querySelector('input[value="new tag"]')).toBeInTheDocument();
      expect(mockedAxios.put).toHaveBeenCalledWith("/api/v1/campaigns/810/audience-rules/95", {
        name: "tags",
        not: false,
        operator: "in",
        values: ["new tag"]
      });
    });

    expect(queryByTestId("loader")).toBeNull();
    fireEvent.click(getByTestId("delete-button"));
    expect(getByTestId("loader")).toBeInTheDocument();

    await waitFor(() => {
      expect(queryByTestId("loader")).toBeNull();
      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
      expect(mockedAxios.delete).toHaveBeenCalledWith("/api/v1/campaigns/810/audience-rules/95");
    });
  });

  it("show show rule details without editing capability", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          audience: {
            rules: [
              { id: 768, name: "country", not: false, operator: "in", values: ["EE", "BY"] },
              {
                id: 769,
                name: "language",
                not: false,
                operator: "in",
                values: ["en"]
              },
              {
                id: 770,
                name: "numDeposits",
                not: false,
                operator: "=",
                values: "1"
              }
            ]
          },
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
          status: "draft"
        }
      }
    });

    await store.dispatch<any>(fetchCampaign(810));

    const { getByText, getByTestId } = render(
      <Wrapper store={store} history={history}>
        <Route path={path}>
          <CampaignAudience isEditable={false} />
        </Route>
      </Wrapper>
    );

    const countryRule = getByTestId("country");
    const languageRule = getByTestId("language");
    const numDeposits = getByTestId("numDeposits");

    expect(getByText("Static")).toBeInTheDocument();
    expect(getByText("Dynamic")).toBeInTheDocument();
    expect(getByText("Audience is players who match the rules when campaign is started.")).toBeInTheDocument();

    expect(countryRule).toBeInTheDocument();
    expect(getByText("Country")).toBeInTheDocument();

    expect(languageRule).toBeInTheDocument();
    expect(getByText("Language")).toBeInTheDocument();

    expect(numDeposits).toBeInTheDocument();
    expect(getByText("Number of deposits")).toBeInTheDocument();
    expect(numDeposits.querySelector('input[name="values"]'));
    expect(numDeposits.querySelector('input[values="1"]'));
  });
});
