import { CampaignsAPI, FetchApi } from "./types";
import { PREFIX } from "./";

export default (fetchApi: FetchApi): CampaignsAPI => ({
  getPlayerCampaigns: values =>
    fetchApi(`${PREFIX}/campaigns`, {
      method: "POST",
      body: JSON.stringify(values),
    }),
  getAffiliates: () => fetchApi(`${PREFIX}/campaigns/affiliates`),
});
