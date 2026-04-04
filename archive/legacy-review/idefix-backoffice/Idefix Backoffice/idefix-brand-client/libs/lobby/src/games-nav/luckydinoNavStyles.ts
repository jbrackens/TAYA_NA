import { css } from "styled-components";
import { Breakpoints } from "@brandserver-client/ui";

export const luckyDinoNavStyles = css`
  display: flex;
  justify-content: center;

  nav {
    @media (min-width: 961px) and (max-width: 1079px) {
      width: 885px;
    }

    @media (min-width: 1080px) and (max-width: 1254px) {
      width: 1060px;
    }

    @media (min-width: 1255px) and (max-width: 1429px) {
      width: 1235px;
    }

    @media (min-width: 1430px) and (max-width: 1604px) {
      width: 1410px;
    }

    @media (min-width: 1605px) and (max-width: 1779px) {
      width: 1585px;
    }

    @media (min-width: 1780px) and (max-width: 1954px) {
      width: 1760px;
    }

    @media (min-width: 1955px) and (max-width: 2129px) {
      width: 1935px;
    }

    @media (min-width: 2130px) and (max-width: 2304px) {
      width: 2110px;
    }

    @media (min-width: 2305px) {
      width: 2285px;
    }

    &.games-nav--sticky {
      background-color: rgba(246, 246, 248, 0.85);
      box-shadow: unset;
    }

    &.games-nav--fixed {
      background: ${({ theme }) => theme.palette.secondaryLightest};
    }
  }

  .games-nav__wrapper {
    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      max-width: unset;
    }
  }
`;
