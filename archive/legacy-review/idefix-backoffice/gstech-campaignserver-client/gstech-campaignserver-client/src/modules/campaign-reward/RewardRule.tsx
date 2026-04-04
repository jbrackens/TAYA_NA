import * as React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import capitalize from "lodash/capitalize";
import isNil from "lodash/isNil";
import isUndefined from "lodash/isUndefined";
import cn from "classnames";
import { RewardRule as RewardRuleType } from "app/types";

import { Card, CardHeader, CardContent, Loader, MenuItem, Popup, Dropdown, IconButton } from "../../components";
import { MoreVertical, Trash, Edit } from "../../icons";
import { selectLoadingById } from "./campaignRewardSlice";
import { RootState } from "../../redux";
import { selectRewardById } from "../rewards";

const StyledRewardRule = styled.div`
  .reward-rule {
    &__card {
      &--empty {
        background-color: ${({ theme }) => theme.palette.redLight};
      }
    }

    &__loader {
      width: 20px;
      height: 20px;
    }
  }

  .content-card {
    &__main-content {
      display: flex;
      margin-top: 16px;
      margin-bottom: 14px;
    }

    &__column {
      display: flex;
      flex-direction: column;

      &:not(:first-child) {
        margin-left: 54px;
      }
    }

    &__value {
      margin-left: 4px;
    }
  }

  .range-between::before {
    content: "-";
    padding: 0 4px;
  }

  .with-description {
    white-space: nowrap;
    overflow-x: hidden;
    max-width: 300px;
    text-overflow: ellipsis;
  }
`;

interface IProps {
  rewardRule: RewardRuleType;
  isEditable: boolean;
  onOpenDrawer: () => void;
  onDelete: () => void;
}

const RewardRule: React.FC<IProps> = ({ rewardRule, isEditable, onOpenDrawer, onDelete }) => {
  const { rewardId, titles, minDeposit, maxDeposit, trigger, quantity, wager, id, useOnCredit } = rewardRule;

  const loading = useSelector((state: RootState) => selectLoadingById(state, id));
  const reward = useSelector((state: RootState) => selectRewardById(state, rewardId));

  const rewardDescription = reward
    ? Number(quantity) > 1
      ? `${quantity} x ${reward.externalId}`
      : `${reward.externalId} ${reward.description}`
    : "-";

  const isNotFull =
    (trigger === "deposit" &&
      titles &&
      Object.values(titles).some(
        ({ text, required }: { text: string; required?: boolean }) => text.length === 0 && required
      )) ||
    !rewardId;

  return (
    <StyledRewardRule>
      <Card appearance="flat" className={cn("reward-rule__card", { "reward-rule__card--empty": isNotFull })}>
        <CardHeader
          action={
            loading ? (
              <Loader className="reward-rule__loader" />
            ) : (
              isEditable && (
                <Dropdown
                  data-testid="dropdown-button"
                  align="right"
                  button={
                    <IconButton data-testid="dropdown-button" style={{ marginLeft: 200 }}>
                      <MoreVertical />
                    </IconButton>
                  }
                >
                  <Popup>
                    <MenuItem data-testid="edit-button" value="edit" icon={<Edit />} onClick={onOpenDrawer}>
                      Edit
                    </MenuItem>
                    <MenuItem data-testid="remove-button" value="remove" icon={<Trash />} red onClick={onDelete}>
                      Remove
                    </MenuItem>
                  </Popup>
                </Dropdown>
              )
            )
          }
        >
          {trigger === "deposit"
            ? titles?.en?.text?.length === 0 || isUndefined(titles?.en?.text)
              ? `<Unset>`
              : titles?.en?.text
            : null}
        </CardHeader>
        <CardContent>
          <div className="reward-rule__card-content content-card">
            <div className="content-card__main-content">
              {trigger === "deposit" && (
                <div className="content-card__column">
                  <span className="text-small-reg">Deposit</span>
                  <div>
                    <span className="text-main-med">{`€${minDeposit}`}</span>
                    {!isNil(maxDeposit) && <span className="text-main-med range-between">{`€${maxDeposit}`}</span>}
                  </div>
                </div>
              )}
              <div className="content-card__column">
                <span className="text-small-reg">Trigger</span>
                <span className="text-main-med">{capitalize(trigger)}</span>
              </div>
              <div className="content-card__column">
                <span className="text-small-reg">Credit</span>
                <span className="text-main-med with-description" title={rewardDescription}>
                  {rewardDescription}
                </span>
              </div>
              <div className="content-card__column">
                <span className="text-small-reg">Use instantly when credited</span>
                <span className="text-main-med with-description">{useOnCredit ? "True" : "False"}</span>
              </div>
            </div>

            {trigger === "deposit" && (
              <div>
                <span className="text-small-reg">Wagering Requirement:</span>
                <span className="content-card__value text-main-med">{wager}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </StyledRewardRule>
  );
};

export { RewardRule };
