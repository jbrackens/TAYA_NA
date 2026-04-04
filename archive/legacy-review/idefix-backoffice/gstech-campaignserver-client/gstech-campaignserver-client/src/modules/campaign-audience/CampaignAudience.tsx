import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import styled from "styled-components";
import { AxiosError } from "axios";
import { ApiServerError, AudienceType } from "app/types";
import { toast } from "react-toastify";
import isArray from "lodash/isArray";

import { Tab, Tabs, Dropdown, Popup, MenuItem, DownloadCSVButton } from "../../components";
import { Users } from "../../icons";
import {
  selectAudienceType,
  selectCampaignInfo,
  updateCampaign,
  selectCampaignAudienceStats,
  fetchCampaignStats
} from "../campaign-info";
import {
  selectCountryOptions,
  selectLanguageOptions,
  selectTagOptions,
  selectSegmentOptions,
  selectCampaignOptions
} from "../app";
import { addRuleThunk, addCsvRuleThunk, selectRuleEntities, selectRuleIds } from "./campaignAudienceSlice";
import AudienceRuleForm from "./AudienceRuleForm";
import CSVFileButton from "./components/CSVFileButton";
import PasteCSV from "./components/PasteCSV";
import { setRuleInitialValues } from "./utils";
import { RULE_TYPES } from ".";
import { AppDispatch, RootState } from "../../redux";
import { selectContentOptions } from "../content";

const StyledCampaignAudience = styled.div`
  display: flex;
  flex-direction: column;

  .audience__description {
    color: ${({ theme }) => theme.palette.blackMiddle};
    margin-bottom: 32px;
  }

  .audience__type-block {
    display: flex;
    margin-bottom: 32px;
    align-items: center;

    p {
      margin-left: 16px;
      color: ${({ theme }) => theme.palette.blackMiddle};
    }
  }

  .audience__rules {
    margin-bottom: 32px;

    & > * {
      margin-top: 16px;

      &:first-child {
        margin-top: 0;
      }
    }
  }

  .audience__actions {
    display: flex;
  }

  .actions-audience {
    display: flex;
    align-items: center;

    &__dropdown {
      margin-right: 8px;
    }

    &__add-csv {
      display: flex;
      align-items: center;
      margin-left: 8px;

      & > :last-child {
        margin-left: 8px;
      }
    }

    &__text {
      margin-left: 12px;
      color: ${({ theme }) => theme.palette.blackDark};
    }

    &__icon {
      width: 20px;
      height: 20px;
      margin-left: 4px;
      fill: ${({ theme }) => theme.palette.blackDark};
    }
  }
`;

interface IProps {
  isEditable: boolean;
}

export const CampaignAudience: React.FC<IProps> = ({ isEditable }) => {
  const audienceType = useSelector(selectAudienceType);
  const ruleIds = useSelector(selectRuleIds);
  const ruleEntities = useSelector(selectRuleEntities);
  const countryOptions = useSelector(selectCountryOptions);
  const languageOptions = useSelector(selectLanguageOptions);
  const tagOptions = useSelector(selectTagOptions);
  const segmentOptions = useSelector(selectSegmentOptions);
  const campaignOptions = useSelector(selectCampaignOptions);
  const campaignInfoState = useSelector(selectCampaignInfo);
  const landingsOptions = useSelector(selectContentOptions);
  const campaignAudienceStats = useSelector((state: RootState) => selectCampaignAudienceStats(state, "audience"));

  const { id: campaignId } = campaignInfoState.info!;

  const { statsLoading } = campaignInfoState;

  const dispatch: AppDispatch = useDispatch();

  const handleSetAudienceType = React.useCallback(
    async (newValue: string | number | string[] | boolean) => {
      await dispatch(updateCampaign({ audienceType: newValue as AudienceType }));
      await dispatch(fetchCampaignStats(campaignId));
    },
    [dispatch, campaignId]
  );

  const handleAddRule = React.useCallback(
    async (value: string) => {
      const data = setRuleInitialValues(value);
      try {
        await dispatch(addRuleThunk({ campaignId, data }));

        if (!isArray(data.values) || data.values.length !== 0) {
          dispatch(fetchCampaignStats(campaignId));
        }
      } catch (err) {
        const error: AxiosError<ApiServerError> = err;

        if (error.response) {
          toast.error(error.response.data.error.message);
        } else {
          toast.error(error.message);
        }
      }
    },
    [campaignId, dispatch]
  );

  const handleAddCSVRule = React.useCallback(
    async (fileName: string, formData: FormData) => {
      try {
        await dispatch(addCsvRuleThunk({ campaignId, fileName, formData }));
        dispatch(fetchCampaignStats(campaignId));
      } catch (err) {
        const error: AxiosError<ApiServerError> = err;

        if (error.response) {
          toast.error(error.response.data.error.message);
        } else {
          toast.error(error.message);
        }
      }
    },
    [campaignId, dispatch]
  );

  return (
    <StyledCampaignAudience>
      <h2 className="text-header">{isEditable ? "Select Audience" : "Audience"}</h2>
      {isEditable && <div className="audience__description text-main-reg">Select target audience for campaign.</div>}
      <div className="audience__type-block">
        <Tabs value={audienceType} onChange={handleSetAudienceType} disabled={!isEditable}>
          <Tab value="static">Static</Tab>
          <Tab data-testid="dynamic-tab" value="dynamic">
            Dynamic
          </Tab>
        </Tabs>
        {audienceType === "static" && (
          <p className="text-small-reg">Audience is players who match the rules when campaign is started.</p>
        )}
        {audienceType === "dynamic" && (
          <p className="text-small-reg">Audience is updated as long as campaign is running</p>
        )}
      </div>
      {ruleIds.length > 0 && (
        <div className="audience__rules">
          {ruleIds.map(ruleId => (
            <AudienceRuleForm
              key={ruleId}
              rule={ruleEntities[ruleId]!}
              campaignId={campaignId}
              notEditable={!isEditable}
              statsLoading={statsLoading}
              countryOptions={countryOptions}
              languageOptions={languageOptions}
              tagOptions={tagOptions}
              segmentOptions={segmentOptions}
              campaignOptions={campaignOptions}
              landingsOptions={landingsOptions}
            />
          ))}
        </div>
      )}
      <div className="audience__actions actions-audience">
        {isEditable && (
          <Dropdown title="Add rule" className="actions-audience__dropdown">
            <Popup>
              {RULE_TYPES.map(ruleType => (
                <MenuItem value={ruleType.value} key={ruleType.value} onClick={handleAddRule}>
                  {ruleType.label}
                </MenuItem>
              ))}
            </Popup>
          </Dropdown>
        )}
        <DownloadCSVButton campaignId={campaignId} />
        {isEditable && (
          <div className="actions-audience__add-csv">
            <CSVFileButton onLoadFile={handleAddCSVRule} />
            <PasteCSV onLoadFile={handleAddCSVRule} />
          </div>
        )}
        <p className="actions-audience__text text-main-med">
          Contacts in list: {!statsLoading && campaignAudienceStats ? campaignAudienceStats.value : "..."}
        </p>
        <Users className="actions-audience__icon" />
      </div>
    </StyledCampaignAudience>
  );
};
