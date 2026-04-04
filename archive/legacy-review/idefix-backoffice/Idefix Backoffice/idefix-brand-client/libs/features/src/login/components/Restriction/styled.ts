import { Breakpoints } from "@brandserver-client/ui";
import styled from "styled-components";

export const StyledRestriction = styled.div`
  color: ${props => props.theme.palette.primary};
  z-index: 1000;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    padding-bottom: 50px;
  }

  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    max-width: 361px;
  }

  .restriction__wrapper {
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      height: calc(100% - 40px);
      display: flex;
      flex-direction: column;
    }
  }

  .restriction__title {
    ${({ theme }) => theme.typography.text30BoldUpper};
    line-height: 26px;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.mobile)} {
      font-size: 25px;
      line-height: 32px;
    }
  }

  .restriction__content {
    display: flex;
    flex-direction: column;
    margin-top: 50px;
    line-height: 12px;

    .date {
      margin-top: 20px;
      ${({ theme }) => theme.typography.text24Bold};
      color: ${({ theme }) => theme.palette.accent};
    }
  }

  .restriction__request-text {
    margin-top: 29px;
    font-weight: normal;
    line-height: normal;
  }

  .restriction__button-wrap {
    margin-top: 50px;
  }

  .btn--login_exclusion_allowed_never {
    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      padding-left: 45px;
      padding-right: 45px;
    }
  }
`;
