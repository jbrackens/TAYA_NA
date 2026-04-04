import * as React from "react";
import styled from "styled-components";
import { useSelector, useDispatch } from "react-redux";
import { useMessages, useLogout } from "@brandserver-client/hooks";
import DepositBlock from "./blocks/DepositBlock";
import {
  Exclusion,
  SubmitExclusion,
  LimitLengthWithText
} from "@brandserver-client/types";
import {
  getPlayer,
  getExclusions,
  fetchExclusions,
  fetchSetExclusion
} from "@brandserver-client/lobby";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { ActiveExclusion } from "../active-exclusion";
import LossBlock from "./blocks/LossBlock";
import PlaytimeBlock from "./blocks/PlaytimeBlock";
import TimeoutBlock from "./blocks/TimeoutBlock";
import GamePauseBlock from "./blocks/GamePauseBlock";

const StyledSelfExclusions = styled.div`
  .self-exclusions__containers {
    display: flex;
    justify-content: space-between;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      flex-direction: column;
    }
  }

  .self-exclusions__side-container {
    flex: 1;
    &:first-child {
      margin-right: 40px;

      @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
        margin-right: 0px;
      }
    }
  }

  .self-exclusions__block {
    margin-bottom: 34px;
  }

  .self-exclusions__note {
    ${({ theme }) => theme.typography.text14};
    width: 100%;
    background: ${({ theme }) => theme.palette.primaryLightest};
    color: ${({ theme }) => theme.palette.contrastDark};
    padding: 24px;
    border-radius: 5px;
    margin-bottom: 36px;
  }
`;

const SelfExclusions: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const { minDepositLimit, limits } = useSelector(getExclusions);

  const logout = useLogout();
  const dispatch = useDispatch();
  const { Loader } = useRegistry();
  const player = useSelector(getPlayer);

  const messages = useMessages({
    oneDay: "selfexclusion.1day",
    oneWeek: "selfexclusion.1week",
    oneMonth: "selfexclusion.1month",
    note: "selfexclusion.note"
  });

  const timeLimits: LimitLengthWithText[] = React.useMemo(
    () => [
      {
        time: 1,
        message: messages.oneDay
      },
      {
        time: 7,
        message: messages.oneWeek
      },
      {
        time: 30,
        message: messages.oneMonth
      }
    ],
    [messages]
  );

  const fetchLimits = async () => {
    setIsLoading(true);
    dispatch(fetchExclusions() as any);
    setIsLoading(false);
  };

  React.useEffect(() => {
    fetchLimits();
  }, []);

  const submitLimit = async (exclusion: SubmitExclusion) => {
    setIsLoading(true);
    await dispatch(fetchSetExclusion(exclusion) as any);
    setIsLoading(false);

    if (exclusion.limitType === "pause") {
      setIsLoading(true);
      return logout();
    }
  };

  const renderLimit = (limitType: Exclusion["limitType"]) => {
    const existingLimit = limits.find(
      (limit: Exclusion) => limit.limitType == limitType
    );

    if (existingLimit) {
      return (
        <ActiveExclusion
          className="self-exclusions__block"
          exclusion={existingLimit}
        />
      );
    } else {
      switch (limitType) {
        case "loss": {
          return (
            <LossBlock
              className="self-exclusions__block"
              timeLimits={timeLimits}
              currency={{
                currencyISO: player.CurrencyISO,
                currencySymbol: player.currencySymbol
              }}
              onSubmit={submitLimit}
            />
          );
        }
        case "deposit": {
          return (
            <DepositBlock
              className="self-exclusions__block"
              timeLimits={timeLimits}
              minDepositLimit={minDepositLimit}
              currency={{
                currencyISO: player.CurrencyISO,
                currencySymbol: player.currencySymbol
              }}
              onSubmit={submitLimit}
            />
          );
        }
        case "play": {
          return (
            <PlaytimeBlock
              className="self-exclusions__block"
              timeLimits={timeLimits}
              onSubmit={submitLimit}
            />
          );
        }
        case "timeout": {
          return (
            <TimeoutBlock
              className="self-exclusions__block"
              onSubmit={submitLimit}
              timeLimits={timeLimits}
            />
          );
        }
      }
    }
  };

  if (isLoading || minDepositLimit === 0) {
    return <Loader />;
  }

  if (minDepositLimit > 0) {
    return (
      <StyledSelfExclusions>
        <div className="self-exclusions__containers">
          <div className="self-exclusions__side-container">
            {renderLimit("loss")}
            {renderLimit("deposit")}
          </div>
          <div className="self-exclusions__side-container">
            {renderLimit("play")}
            {renderLimit("timeout")}
            <GamePauseBlock
              className="self-exclusions__block"
              timeLimits={timeLimits}
              onSubmit={submitLimit}
            />
          </div>
        </div>
        <div className="self-exclusions__note">{messages.note}</div>
      </StyledSelfExclusions>
    );
  }

  return null;
};

export default SelfExclusions;
