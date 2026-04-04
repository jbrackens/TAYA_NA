import * as React from "react";
import styled from "styled-components";
import { ChevronLeftIcon } from "@brandserver-client/icons";
import { BonusOption, CampaignOption } from "@brandserver-client/types";
import { getDepositBonusIcon } from "../utils";

interface Props {
  bonus: BonusOption | CampaignOption;
  onToggleSplashScreen: () => void;
}

const BackButton: React.FC<Props> = ({ bonus, onToggleSplashScreen }) => {
  const BonusIcon = getDepositBonusIcon(bonus.icon);

  return (
    <StyledBackButton onClick={onToggleSplashScreen}>
      <ChevronLeftIcon className="back-button__back-icon" />
      <BonusIcon className="back-button__icon" />
      <span className="back-button__title">
        {typeof bonus.title === "string" ? bonus.title : bonus.title.text}
      </span>
    </StyledBackButton>
  );
};

const StyledBackButton = styled.div`
  display: flex;
  cursor: pointer;
  align-items: center;
  padding: 16px 20px 15px 15px;
  border-radius: 5px;
  margin-bottom: 25px;
  background: ${({ theme }) => theme.palette.primaryLightest};

  .back-button__back-icon {
    width: 15px;
    height: 15px;
    cursor: pointer;
    fill: ${({ theme }) => theme.palette.contrastLight};
  }

  .back-button__icon {
    width: 13px;
    height: 13px;
    margin-left: 15px;
  }

  .back-button__title {
    margin-left: 10px;
    ${({ theme }) => theme.typography.text14Bold};
    line-height: 23px;
    color: ${({ theme }) => theme.palette.contrastLight};
  }
`;

export { BackButton };
