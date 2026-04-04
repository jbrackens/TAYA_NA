import * as React from "react";
import { useParams, useHistory } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { toast } from "react-toastify";
import isNaN from "lodash/isNaN";

import { Loader } from "../../components";
import { AppDispatch } from "../../redux";
import { CampaignInfo } from "../../modules/campaign-info";
import { CampaignReward } from "../../modules/campaign-reward";
import { CampaignAudience } from "../../modules/campaign-audience";
import { CampaignEmail } from "../../modules/campaign-email";
import { CampaignSms } from "../../modules/campaign-sms";
import { CampaignNotification } from "../../modules/campaign-notification";
import { CampaignBanner } from "../../modules/campaign-banner";
import { selectCampaignInfo, fetchCampaign, resetCampaignState, fetchCampaignStats } from "../../modules/campaign-info";

const StyledCampaign = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  max-width: 1440px;
  margin: 64px auto 0;
  padding: 32px;
  overflow-y: auto;

  .loader-wrapper {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;

    & > .loader {
      width: 64px;
      height: 64px;
    }
  }

  .category:first-child {
    margin-top: -32px;
  }

  .category:not(:first-child) {
    margin-top: 64px;
  }

  & > .category:last-child {
    margin-bottom: 440px;
  }
`;
interface Params {
  campaignId: string;
}

const CampaignDetails = () => {
  const { campaignId } = useParams<Params>();
  const { push } = useHistory();

  const dispatch: AppDispatch = useDispatch();
  const { fetchLoading, info } = useSelector(selectCampaignInfo);

  const isEditable = info?.status === "draft";

  const handleFetchCampaign = React.useCallback(
    async campaignId => {
      if (isNaN(campaignId)) {
        return push("/not-found");
      }

      const fetchCampaignAction = await dispatch(fetchCampaign(campaignId));

      if (fetchCampaign.rejected.match(fetchCampaignAction)) {
        if (fetchCampaignAction.payload?.error.status === 404) {
          return push("/not-found");
        }

        if (fetchCampaignAction.payload) {
          return toast.error(`Fetch failed: ${fetchCampaignAction.payload.error.message}`);
        }

        toast.error(`Fetch failed: ${fetchCampaignAction.error.message}`);
      }
    },
    [dispatch, push]
  );

  const handleFetchCampaignStats = React.useCallback(
    async campaignId => {
      if (isNaN(campaignId)) {
        return push("/not-found");
      }

      const fetchCampaignStatsAction = await dispatch(fetchCampaignStats(campaignId));

      if (fetchCampaignStats.rejected.match(fetchCampaignStatsAction)) {
        if (fetchCampaignStatsAction.payload?.error.status === 404) {
          return push("/not-found");
        }

        if (fetchCampaignStatsAction.payload) {
          return toast.error(`Fetch failed: ${fetchCampaignStatsAction.payload.error}`);
        }

        toast.error(`Fetch failed: ${fetchCampaignStatsAction.error}`);
      }
    },
    [dispatch, push]
  );

  React.useEffect(() => {
    handleFetchCampaign(Number(campaignId));
    handleFetchCampaignStats(Number(campaignId));

    return () => {
      dispatch(resetCampaignState());
    };
  }, [dispatch, handleFetchCampaign, handleFetchCampaignStats, campaignId]);

  if (fetchLoading || !info) {
    return (
      <StyledCampaign>
        <div className="loader-wrapper">
          <Loader className="loader" />
        </div>
      </StyledCampaign>
    );
  }

  return (
    <StyledCampaign>
      <div className="category">
        <CampaignInfo isEditable={isEditable} />
      </div>
      <div className="category">
        <CampaignAudience isEditable={isEditable} />
      </div>
      <div className="category">
        <CampaignReward isEditable={isEditable} />
      </div>
      <div className="category">
        <CampaignEmail isEditable={isEditable} />
      </div>
      <div className="category">
        <CampaignSms isEditable={isEditable} />
      </div>
      <div className="category">
        <CampaignNotification isEditable={isEditable} />
      </div>
      <div className="category">
        <CampaignBanner isEditable={isEditable} />
      </div>
    </StyledCampaign>
  );
};

export { CampaignDetails };
