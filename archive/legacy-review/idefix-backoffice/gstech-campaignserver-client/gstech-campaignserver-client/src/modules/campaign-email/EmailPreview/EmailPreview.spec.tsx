import * as React from "react";
import { configureStore, Store } from "@reduxjs/toolkit";
import { render, cleanup } from "@testing-library/react";
import axios from "axios";
import { Country, Language } from "app/types";

import { Wrapper } from "../../../test";
import { EmailPreview } from "./EmailPreview";
import { createEmail } from "../../campaign-email";
import rootReducer, { RootState } from "../../../redux/rootReducer";
import { fetchBrandSettings } from "../../app";
import { getEmailPreview } from "../EmailPreview/emailPreviewSlice";

jest.mock("axios");

const drawerRoot = document.createElement("div");
drawerRoot.setAttribute("id", "drawer-root");
document.body.appendChild(drawerRoot);

const mockedAxios = axios as jest.Mocked<typeof axios>;
const onClose = jest.fn();

describe("email -> EmailPreview container", () => {
  let store: Store<RootState>;
  const contentId = 1234;

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    store = configureStore({ reducer: rootReducer });

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
          tags: [],
          segments: [],
          smses: [],
          notifications: [],
          thumbnails: []
        },
        "",
        ""
      )
    );

    store.dispatch(
      getEmailPreview.fulfilled({ html: "<h1>Email Preview</h1>", lang: "en" }, "", { lang: "en", contentId })
    );

    mockedAxios.get.mockResolvedValueOnce({ data: "some html content" });
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: {
          emailId: 1
        }
      }
    });
  });

  it("render component with right initial state", () => {
    const { getByText, getByTestId, getByRole } = render(
      <Wrapper store={store}>
        <EmailPreview onClose={onClose} />
      </Wrapper>
    );

    expect(getByText("Email Preview")).toBeInTheDocument();
    expect(getByText("Close")).toBeInTheDocument();
    // expect(getByRole("listbox")).toBeInTheDocument();
    expect(getByTestId("email-iframe")).toBeInTheDocument();
  });

  describe("async operations", () => {
    it("should send request for get email preview", async () => {
      const { getByRole } = render(
        <Wrapper store={store}>
          <EmailPreview onClose={onClose} />
        </Wrapper>
      );

      // const select = getByRole("listbox");

      // @ts-ignore
      await store.dispatch(createEmail({ campaignId: 1, values: { contentId, sendingTime: "" } }));

      // fireEvent.change(select, { target: { value: "en" } });

      // expect(mockedAxios.get).toBeCalledTimes(1);
      // expect(mockedAxios.get).toHaveBeenCalledWith(`/api/v1/emails/${contentId}/preview`, { params: { lang: "en" } });
    });
  });
});
