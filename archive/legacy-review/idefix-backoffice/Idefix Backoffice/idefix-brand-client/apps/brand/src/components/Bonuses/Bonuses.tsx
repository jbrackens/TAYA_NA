import React, { useContext, useCallback, useState } from "react";
import styled, { ThemeContext } from "styled-components";
import isEmpty from "lodash/isEmpty";
import { Reward as Bonus } from "@brandserver-client/types";
import { useRegistry } from "@brandserver-client/ui";
import { useMessages } from "@brandserver-client/hooks";
import { ApiContext } from "@brandserver-client/api";
import { pushRoute } from "@brandserver-client/utils";

interface Props {
  bonuses: Bonus[];
  isLoading: boolean;
}

const StyledBonuses = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .bonuses__title,
  .bonuses__content-title {
    ${({ theme }) => theme.typography.text21BoldUpper};
  }

  .bonuses__content-title {
    margin: 16px 0;
  }

  .bonuses__info {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.contrast};
    font-weight: 300;
    line-height: 24px;
    margin-top: 16px;
    max-width: 684px;
  }

  .bonuses__grid {
    max-height: 490px;
    max-width: 684px;
    overflow: hidden;
    overflow-y: auto;
    display: grid;
    grid-gap: 16px;
    grid-auto-columns: auto;
    grid-auto-flow: row;
    grid-template-columns: repeat(auto-fit, 152px);
  }

  .bonus__card {
    position: relative;
    cursor: pointer;
    display: flex;
    width: 152px;
    height: 152px;
    overflow: hidden;
    border-radius: 12px;
  }

  .bonus__card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .bonus__card-name {
    position: absolute;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 28px;
    ${({ theme }) => theme.typography.text12Bold};
    color: ${({ theme }) => theme.palette.contrast};
    background-color: rgba(23, 23, 33, 0.8);
  }

  .bonus__loader {
    width: 100%;
    height: 50px;
    display: flex;
    justify-content: center;

    div {
      width: 50px;
    }
  }
`;

export const Bonuses: React.FC<Props> = ({ bonuses, isLoading }) => {
  const api = useContext(ApiContext);
  const { bonusThumbsCdn } = useContext(ThemeContext);

  const { Loader } = useRegistry();

  const messages = useMessages({
    title: "vierewards.title",
    content: "vierewards.content",
    noContent: "vierewards.no-content",
    heading: "vierewards.heading"
  });
  const [activeBonus, setActiveBonus] = useState<string | null>(null);

  const handleBonusClick = useCallback(async (id: string) => {
    setActiveBonus(id);
    const { reward } = await api.rewards.getSingleReward(id);

    if (reward && reward.action) {
      if (reward.action.includes("betby")) {
        const gameName = reward.action.split("/")[3];
        const pathname = `/loggedin/sports/${gameName}`;
        return pushRoute(pathname);
      } else {
        return pushRoute(reward.action);
      }
    }

    return setActiveBonus(null);
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <StyledBonuses>
      <h2 className="bonuses__title">{messages.title}</h2>
      <div>
        <div className="bonuses__info">{messages.content}</div>
        <div className="bonuses__content">
          {isEmpty(bonuses) ? (
            <p className="bonuses__content-title">{messages.noContent}</p>
          ) : (
            <div className="bonuses__content-available">
              <div className="bonuses__content-title">{messages.heading}</div>
              {!activeBonus ? (
                <div className="bonuses__grid">
                  {bonuses.map(({ id, type, thumbnail }) => (
                    <div
                      key={id}
                      onClick={() => handleBonusClick(id)}
                      className="bonus__card"
                    >
                      <img
                        alt={id}
                        className="bonus__card-image"
                        src={`${bonusThumbsCdn}thumbsm/${thumbnail}`}
                        srcSet={`${bonusThumbsCdn}thumbsm2x/${thumbnail} 2x`}
                      />
                      <div className="bonus__card-name">
                        <div dangerouslySetInnerHTML={{ __html: type }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bonus__loader">
                  <Loader />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </StyledBonuses>
  );
};
