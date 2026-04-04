import * as React from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Link, useRouteMatch, useHistory } from "react-router-dom";
import isEmpty from "lodash/isEmpty";

import { Tabs, Tab, Button, Card, CardContent, StatsCardContent } from "../../components";
import { Plus } from "../../icons";
import {
  selectCreditMultiple,
  selectCampaignInfo,
  updateCampaign,
  selectCampaignRewardGeneralStats,
  selectCampaignRewardStats
} from "../campaign-info";
import { selectRewardRuleIds, selectRewardRuleEntities, removeRewardRule } from "./campaignRewardSlice";
import { fetchRewards } from "../rewards";
import { RewardRule } from "./RewardRule";
import { AppDispatch, RootState } from "../../redux";
import { selectRewardTypesByBrandWithHidden } from "../app";

const StyledCampaignReward = styled.div`
  display: flex;
  flex-direction: column;

  .general-stats-card {
    margin-top: 16px;
  }

  .reward__description {
    color: ${({ theme }) => theme.palette.blackMiddle};
  }

  .reward__credit-multiple {
    margin-top: 32px;

    & > span {
      margin-left: 16px;
      color: ${({ theme }) => theme.palette.blackDark};
    }
  }

  .reward__rules {
    margin-top: 32px;

    & > div:not(:first-child) {
      margin-top: 16px;
    }
  }

  .reward__block {
    display: flex;

    & > .block-card {
      margin-left: 16px;
    }
  }

  .reward__add-button {
    margin-top: 32px;
  }
`;

interface IProps {
  isEditable: boolean;
}

interface Params {
  brandId: string;
}

export const CampaignReward: React.FC<IProps> = ({ isEditable }) => {
  const { brandId } = useParams<Params>();
  const { push } = useHistory();
  const { url } = useRouteMatch();

  const dispatch: AppDispatch = useDispatch();
  const rewardRuleIds = useSelector(selectRewardRuleIds);
  const rewardRuleEntities = useSelector(selectRewardRuleEntities);
  const creditMultiple = useSelector(selectCreditMultiple);
  const campaignInfoState = useSelector(selectCampaignInfo);
  const rewardTypesByBrand = useSelector((state: RootState) => selectRewardTypesByBrandWithHidden(state, brandId));
  const generalStats = useSelector(selectCampaignRewardGeneralStats);
  const rewardsStats = useSelector(selectCampaignRewardStats);
  const { id: campaignId } = campaignInfoState.info!;

  React.useEffect(() => {
    if (rewardTypesByBrand) {
      dispatch(
        fetchRewards({
          brandId
        })
      );
    }
  }, [dispatch, brandId, rewardTypesByBrand, rewardRuleIds]);

  const handleSetCreditMultiple = React.useCallback(
    (creditMultiple: string | number | string[] | boolean) => {
      dispatch(updateCampaign({ creditMultiple: creditMultiple as boolean }));
    },
    [dispatch]
  );

  const handleOpenEditRewardRuleDrawer = React.useCallback(
    (id: number) => () =>
      push({ pathname: url, search: `drawer=edit-reward-rule&id=${id}`, state: { hasPrevRoute: true } }),
    [push, url]
  );

  const handleDeleteReward = React.useCallback(
    (rewardId: number) => () => dispatch(removeRewardRule({ campaignId: campaignId, rewardId })),
    [dispatch, campaignId]
  );

  return (
    <StyledCampaignReward>
      <h2 className="text-header">Rewarding</h2>
      {isEditable && <p className="reward__description text-main-reg">How members of this campaign will be rewarded</p>}
      {!isEditable && (
        <Card className="general-stats-card">
          <CardContent>
            <StatsCardContent stats={generalStats || []} />
          </CardContent>
        </Card>
      )}
      <div className="reward__credit-multiple">
        <Tabs
          data-testid="credit-multiple"
          value={creditMultiple}
          disabled={!isEditable}
          onChange={handleSetCreditMultiple}
        >
          <Tab value={true}>True</Tab>
          <Tab value={false}>False</Tab>
        </Tabs>
        <span className="text-main-reg">Credit multiple times</span>
      </div>
      {!isEmpty(rewardRuleIds) && (
        <div className="reward__rules">
          {rewardRuleIds.map(ruleId => (
            <div key={ruleId} className="reward__block">
              <RewardRule
                data-testid="reward-card"
                rewardRule={rewardRuleEntities[ruleId]!}
                isEditable={isEditable}
                onOpenDrawer={handleOpenEditRewardRuleDrawer(ruleId as number)}
                onDelete={handleDeleteReward(ruleId as number)}
              />
              {!isEditable && !isEmpty(rewardsStats) && rewardsStats && (
                <Card appearance="flat" className="reward__block block-card">
                  <CardContent>
                    <StatsCardContent
                      stats={rewardsStats[ruleId]?.map(({ name, value }) => ({ title: name, value })) || []}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
      {isEditable && (
        <Link to={{ pathname: url, search: "drawer=add-reward-rule", state: { hasPrevRoute: true } }}>
          <Button data-testid="add-button" className="reward__add-button" appearance="blue" icon={<Plus />}>
            Add reward
          </Button>
        </Link>
      )}
    </StyledCampaignReward>
  );
};
