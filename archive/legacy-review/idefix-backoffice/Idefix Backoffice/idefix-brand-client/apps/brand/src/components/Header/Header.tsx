import * as React from "react";
import styled from "styled-components";
import { Breakpoints, useRegistry } from "@brandserver-client/ui";
import { PanicButton, GiftIcon } from "@brandserver-client/icons";
import { getCoinIcon } from "@brandserver-client/utils";
import { Profile } from "@brandserver-client/types";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import {
  fetchSetExclusion,
  getBadgeCount,
  getJurisdiction,
  getShowBalance,
  getPlayer,
  getUpdate,
  MenuAnimated
} from "@brandserver-client/lobby";
import Link from "next/link";
import { rgba, getNumberFromString } from "@brandserver-client/utils";
import {
  useIsMyAccount,
  useLogout,
  useMessages
} from "@brandserver-client/hooks";
import cn from "classnames";

const StyledHeader = styled.header`
  height: 80px;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    height: 60px;
  }

  .header__wrapper {
    position: fixed;
    top: 0;
    height: inherit;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    z-index: ${({ theme }) => theme.zIndex.header};
    background-color: ${({ theme }) => theme.palette.primary};

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      height: 60px;
      padding: 10px;
    }
  }

  .actions-container__icon--menu {
    position: relative;
    margin-right: 30px;
    cursor: pointer;

    @media (max-width: 1100px) {
      margin-right: 10px;
    }

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      display: none;
    }
  }

  .actions-container__icon--menu:hover {
    .header__icon--menu:after,
    .header__icon--menu:before,
    .header__icon--menu div {
      background-color: ${({ theme }) => theme.palette.contrast};
    }
  }

  .header__icon--menu:after,
  .header__icon--menu:before,
  .header__icon--menu div {
    background-color: ${({ theme }) => theme.palette.accent};
  }

  .header__icon {
    fill: ${({ theme }) => theme.palette.contrast};
  }

  .header__game-categories {
    justify-content: flex-end;

    @media (max-width: 1124px) {
      justify-content: space-evenly;
    }

    @media (max-width: 1300px) {
      li {
        margin-left: 16px;
      }
    }
  }

  .header__badge {
    position: absolute;
    top: -8px;
    right: -8px;

    display: flex;
    justify-content: center;
    align-items: center;

    width: 18px;
    height: 18px;

    ${({ theme }) => theme.typography.text9Bold};
    background: ${({ theme }) => theme.palette.accent};
    border-radius: 50%;
    color: ${({ theme }) => theme.palette.contrast};
  }

  .header__main-block {
    display: flex;
    justify-content: flex-end;
    height: 100%;
  }

  .header__main-info {
    display: flex;
    align-items: center;
    height: 100%;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      justify-content: flex-end;
      width: 100%;
    }
  }

  .header__user {
    display: flex;
    height: 100%;
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => rgba(theme.palette.secondaryDark, 0.7)};
    line-height: 20px;
    margin-left: 44px;

    &:after {
      content: "";
      width: 1px;
      margin-left: 20px;
      background-color: ${({ theme }) => rgba(theme.palette.contrast, 0.4)};
    }

    a {
      color: ${({ theme }) => theme.palette.contrast};

      &:hover {
        color: ${({ theme }) => theme.palette.accent};
      }
    }

    @media (max-width: 1380px) {
      display: none;
    }
  }

  .header__scene {
    width: 172px;
    height: 100%;
    perspective: 200px;
    margin-left: 20px;
    ${({ theme }) => theme.typography.text18Bold};

    @media (max-width: 960px) {
      margin-left: 10px;
    }

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      flex-grow: 1;
      max-width: 200px;
    }

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.mobile)} {
      width: 110px;
    }

    .card {
      position: relative;
      width: 100%;
      height: 100%;
      transition: transform 1s;
      transform-style: preserve-3d;
    }

    .card__face {
      position: absolute;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      height: 100%;
      padding: 0 10px;
      color: ${({ theme }) => theme.palette.contrast};
      cursor: pointer;
      backface-visibility: hidden;
      border-radius: 5px;
      border: ${({ theme }) => `2px solid${theme.palette.primaryLightest2}`};
      background-color: ${({ theme }) => theme.palette.primaryLightest};
    }

    .card__balance,
    .card__bonus {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card__balance {
      width: 100%;
    }

    .card__divider {
      height: 60%;
      margin: 0 8px;
      border-radius: 2px;
      border-left: ${({ theme }) =>
        `2px solid${theme.palette.primaryLightest2}`};
    }

    .card__bonus {
      width: 40%;
    }

    .card__bonus-icon,
    .card__currency-icon {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 16px;
      height: 16px;
      background-color: transparent;

      svg {
        fill: ${({ theme }) => theme.palette.accent2};
      }
    }

    .card__face--balance {
      margin-left: 5px;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .card__face--bonus-balance {
      margin-left: 5px;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .card__face--front svg {
      backface-visibility: hidden;
    }

    .card__face--back {
      transform: rotateX(180deg);
    }

    .card.is-flipped {
      transform: rotateX(180deg);
    }
  }

  .header__scene--bonused {
    width: 256px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      .card__bonus {
        font-size: 14px;
      }
    }

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.bigMobile)} {
      .card__balance {
        font-size: 14px;
      }

      .card__bonus {
        font-size: 12px;
      }
    }

    .card__balance {
      width: 60%;
    }
  }

  .header__deposit-button {
    width: 112px;
    margin-left: 20px;

    @media (max-width: 960px) {
      margin-left: 10px;
    }

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      width: 80px;
    }
  }

  .actions-container__icon {
    position: relative;
    width: 40px;
    height: 40px;
  }

  .actions-container__icon--panic {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    background-color: ${({ theme }) => theme.palette.error};
    border-radius: 5px;
    margin-left: 10px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      display: none;
    }
  }
`;

interface Props {
  profile: Profile;
  menuTab: string;
  locale: string;
}

export const Header: React.FC<Props> = ({
  profile: { FirstName },
  menuTab,
  locale
}) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const logout = useLogout();
  const { Logo, ButtonLink } = useRegistry();

  const menuButtonOpened = useIsMyAccount();
  const badgeCount = useSelector(getBadgeCount);
  const showBalance = useSelector(getShowBalance);
  const jurisdiction = useSelector(getJurisdiction);
  const { CurrencyISO } = useSelector(getPlayer);
  const isGamePage = router.asPath && router.asPath.includes("/loggedin/game/");

  const {
    balance: { CurrentRealBalance, CurrentBonusBalance }
  } = useSelector(getUpdate);
  const isBonusBalance = !!Number(getNumberFromString(CurrentBonusBalance));

  const messages = useMessages({
    welcome: "loggedin.welcome2",
    nowPlaying: "loggedin.now-playing",
    deposit: "loggedin.deposit"
  });

  const CoinIcon = getCoinIcon(CurrencyISO);

  const linkProps = React.useMemo(
    () =>
      menuButtonOpened
        ? {
            href: "/loggedin"
          }
        : {
            href: `/loggedin/myaccount/${menuTab}`,
            as: `/loggedin/myaccount/${menuTab}`
          },
    [menuButtonOpened]
  );

  const setPanicPause = async () => {
    try {
      await dispatch(
        fetchSetExclusion({
          limitType: "pause",
          limitLength: 1
        }) as any
      );
      return logout();
    } catch (error) {
      console.log(error, "error");
    }
  };

  return (
    <StyledHeader>
      <div className="header__wrapper">
        <div className="actions-container__icon--menu">
          <Link {...linkProps}>
            <a>
              <MenuAnimated
                className="header__icon--menu"
                opened={menuButtonOpened}
              />
            </a>
          </Link>
          {!menuButtonOpened && badgeCount > 0 && (
            <span className="header__badge">{badgeCount}</span>
          )}
        </div>

        <Link href="/loggedin">
          <a>
            <Logo />
          </a>
        </Link>
        <div className="header__main-block">
          <div className="header__main-info">
            <div className="header__user">
              <div>
                {messages.welcome}
                <br />
                <Link
                  href={`/loggedin/myaccount/${menuTab}`}
                  as={`/loggedin/myaccount/${menuTab}`}
                >
                  <a>{FirstName}</a>
                </Link>
              </div>
            </div>

            <Link
              href="/loggedin/myaccount/deposit"
              as="/loggedin/myaccount/deposit"
            >
              <div
                className={cn("header__scene", {
                  "header__scene--bonused": isBonusBalance
                })}
              >
                <div className={cn("card", { "is-flipped": !showBalance })}>
                  <div className="card__face card__face--front">
                    <div className="card__balance">
                      <div className="card__currency-icon">
                        <CoinIcon />
                      </div>
                      <div className="card__face--balance">
                        {getNumberFromString(CurrentRealBalance)}
                      </div>
                    </div>
                    {isBonusBalance && (
                      <>
                        <div className="card__divider" />
                        <div className="card__bonus">
                          <div className="card__bonus-icon">
                            <GiftIcon />
                          </div>
                          <div className="card__face--balance">
                            {getNumberFromString(CurrentBonusBalance)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="card__face card__face--back">
                    <div className="card__currency-icon">
                      <CoinIcon />
                    </div>
                    {messages.nowPlaying}
                  </div>
                </div>
              </div>
            </Link>

            <ButtonLink
              href="/loggedin/myaccount/deposit"
              as="/loggedin/myaccount/deposit"
              className="header__deposit-button"
              color="secondary"
            >
              {messages.deposit}
            </ButtonLink>
          </div>

          {jurisdiction === "GNRS" && isGamePage && (
            <div
              className="actions-container__icon actions-container__icon--panic"
              onClick={setPanicPause}
            >
              <PanicButton className="header__icon" />
            </div>
          )}
        </div>
      </div>
    </StyledHeader>
  );
};
