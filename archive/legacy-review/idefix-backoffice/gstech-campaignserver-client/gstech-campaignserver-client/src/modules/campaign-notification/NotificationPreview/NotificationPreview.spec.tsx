import * as React from "react";
import { configureStore, Store } from "@reduxjs/toolkit";
import { render, cleanup, fireEvent } from "@testing-library/react";
import axios from "axios";
import { createMemoryHistory, History } from "history";
import { Country, Language } from "app/types";

import { Wrapper } from "../../../test";
import NotificationPreview from ".";
import { createNotification } from "../../campaign-notification";
import rootReducer, { RootState } from "../../../redux/rootReducer";
import { fetchBrandSettings } from "../../app";
import { getNotificationPreview } from "./notificationPreviewSlice";

jest.mock("axios");

const drawerRoot = document.createElement("div");
drawerRoot.setAttribute("id", "drawer-root");
document.body.appendChild(drawerRoot);
const mockedAxios = axios as jest.Mocked<typeof axios>;
const onClose = jest.fn();

describe("notification -> NotificationPreview container", () => {
  let store: Store<RootState>;
  let history: History;
  const contentId = 1234;

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    store = configureStore({ reducer: rootReducer });
    history = createMemoryHistory();
    history.push({ pathname: "/campaigns/1/edit", search: "?drawer=notification-preview" });

    const countries: Country[] = [
      {
        brandId: "OS",
        code: "BY",
        name: "Belarus"
      },
      {
        brandId: "OS",
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

    store.dispatch(
      fetchBrandSettings.fulfilled(
        {
          countries,
          languages,
          emails: [],
          smses: [],
          tags: [],
          segments: [],
          notifications: [],
          thumbnails: []
        },
        "",
        ""
      )
    );

    store.dispatch(
      getNotificationPreview.fulfilled(
        {
          html: "<h1>Notification preview</h1>",
          lang: "en"
        },
        "",
        {
          contentId,
          lang: "en"
        }
      )
    );

    mockedAxios.get.mockResolvedValueOnce({ data: "some html content" });
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: {
          notificationId: 1
        }
      }
    });
  });

  it("render component with right initial state", () => {
    const { getByText, getByTestId, getByRole, debug } = render(
      <Wrapper store={store} history={history}>
        <NotificationPreview onClose={onClose} />
      </Wrapper>
    );

    expect(getByText("Notification Preview")).toBeInTheDocument();
    expect(getByText("Close")).toBeInTheDocument();
    // expect(getByRole("listbox")).toBeInTheDocument();
    expect(getByTestId("notification-iframe")).toBeInTheDocument();
  });

  describe("async operations", () => {
    it("should send request for get email preview", async () => {
      const { getByRole } = render(
        <Wrapper store={store}>
          <NotificationPreview onClose={onClose} />
        </Wrapper>
      );

      // const select = getByRole("listbox");

      // @ts-ignore
      await store.dispatch(createNotification({ campaignId: 1, values: { contentId } }));

      // fireEvent.change(select, { target: { value: "en" } });

      // expect(mockedAxios.get).toBeCalledTimes(1);
      // expect(mockedAxios.get).toHaveBeenCalledWith(`/api/v1/notifications/${contentId}/preview`, {
      //   params: { lang: "en" }
      // });
    });
  });
});
