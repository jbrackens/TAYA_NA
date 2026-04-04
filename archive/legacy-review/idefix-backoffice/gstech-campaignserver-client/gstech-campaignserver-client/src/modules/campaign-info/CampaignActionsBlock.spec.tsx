import * as React from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { Route } from "react-router-dom";
import axios from "axios";
import "@testing-library/jest-dom/extend-expect";

import CampaignActionsBlock from "./CampaignActionsBlock";
import { Wrapper } from "../../test";
import { isTimePast } from "./utils";
// TODO fix tests
jest.mock("axios");
jest.mock("./utils");

const mockedAxios = axios as jest.Mocked<typeof axios>;

const history = createMemoryHistory({ initialEntries: ["/LD/campaigns"] });

describe("CampaignActionsBlock", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  // it("campaign in draft status", async () => {
  //   const { getByText, getByTestId } = render(
  //     <Wrapper history={history}>
  //       <Route path="/:brandId/campaigns">
  //         <CampaignActionsBlock id={810} campaignStatus="draft" previewMode={false} />
  //       </Route>
  //     </Wrapper>
  //   );

  //   const startCampaignButton = getByText("Start Campaign");
  //   const dropdown = getByTestId("dropdown")!;

  //   expect(startCampaignButton).toBeInTheDocument();
  //   fireEvent.click(dropdown);
  //   expect(getByText("Duplicate")).toBeInTheDocument();
  //   // expect(getByText("A/B Test")).toBeInTheDocument();
  //   expect(getByText("Archive")).toBeInTheDocument();

  //   mockedAxios.post.mockResolvedValueOnce({ data: { data: { ok: true } } });

  //   fireEvent.click(getByText("Start Campaign"));

  //   expect((startCampaignButton as HTMLButtonElement).disabled).toBeFalsy();
  //   expect((dropdown as HTMLButtonElement).disabled).toBeFalsy();
  //   expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  //   expect(mockedAxios.post).toHaveBeenCalledWith("/api/v1/campaigns/810/activate");
  //   expect(history.location.pathname).toEqual("/LD/campaigns/810/details");

  //   mockedAxios.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });

  //   fireEvent.click(getByText("Archive"));
  //   // expect(dropdown).toHaveAttribute("disabled");

  //   const confirmDelete = getByTestId("confirm-delete");
  //   fireEvent.click(confirmDelete);

  //   expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
  //   expect(mockedAxios.delete).toHaveBeenCalledWith("/api/v1/campaigns/810");
  //   expect(history.location.pathname).toEqual("/LD/campaigns");
  // });

  it("campaign in running status", () => {
    const { getByText, getByTestId } = render(
      <CampaignActionsBlock id={810} campaignStatus="running" previewMode={false} />,
      {
        wrapper: Wrapper as React.FC
      }
    );

    expect(getByText("Stop Campaign")).toBeInTheDocument();
    fireEvent.click(getByTestId("dropdown")!);
    expect(getByText("Duplicate")).toBeInTheDocument();
    // expect(getByText("A/B Test")).toBeInTheDocument();
  });

  // it("campaign in running status with archive ability", async () => {
  //   (isTimePast as jest.Mock).mockImplementationOnce(() => true);

  //   const { getByText, getByTestId } = render(
  //     <CampaignActionsBlock id={810} campaignStatus="running" endTime="2020-05-11T20:59" previewMode={false} />,
  //     {
  //       wrapper: Wrapper as FC
  //     }
  //   );

  //   const dropdown = getByTestId("dropdown")!;

  //   expect(getByText("Stop Campaign")).toBeInTheDocument();
  //   fireEvent.click(dropdown);
  //   expect(getByText("Duplicate")).toBeInTheDocument();
  //   // expect(getByText("A/B Test")).toBeInTheDocument();
  //   expect(getByText("Archive")).toBeInTheDocument();

  //   mockedAxios.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });

  //   fireEvent.click(getByText("Archive"));

  //   const confirmDelete = getByTestId("confirm-delete");
  //   fireEvent.click(confirmDelete);

  //   expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
  //   expect(mockedAxios.delete).toHaveBeenCalledWith("/api/v1/campaigns/810");
  //   expect(history.location.pathname).toEqual("/LD/campaigns");
  // });
});
