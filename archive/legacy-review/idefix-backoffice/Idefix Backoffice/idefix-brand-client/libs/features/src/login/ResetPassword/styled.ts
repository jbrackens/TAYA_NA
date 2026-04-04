import { Breakpoints } from "@brandserver-client/ui";
import styled from "styled-components";

export const StyledResetPassword = styled.div`
  .modal__content {
    max-width: 416px;
    width: 100%;
    display: flex;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      max-width: 100%;
      height: 100%;
    }
  }

  .close-btn {
    cursor: pointer;
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1199;
    text-decoration: none;

    svg {
      height: 20px;
      width: 20px;
      fill: ${props => props.theme.palette.secondary};
    }

    &:hover {
      opacity: 0.8;
    }
  }

  .d--md--none {
    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      display: none;
    }
  }

  form {
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .title {
      ${({ theme }) => theme.typography.text30BoldUpper}
      text-align: center;

      @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
        ${({ theme }) => theme.typography.text24Bold};
      }
    }

    .subtitle {
      margin-top: 18px;
      text-align: center;
      ${({ theme }) => theme.typography.text16};
    }

    .phone {
      text-align: center;
      ${({ theme }) => theme.typography.text16};
    }

    .subform {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 100%;
      height: 100%;
      z-index: 1000;
      margin-top: 40px;
      min-height: 172px;

      @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
        margin-top: 31px;
      }

      @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
        max-width: 330px;
      }

      .input-item__alert {
        position: relative;
        display: inline-block;
        margin: 27px 0 28px 0px;
        line-height: 11px;
        font-size: 14px;
        padding-left: 26px;

        svg {
          content: "";
          position: absolute;
          left: 0px;
          top: -3px;
          fill: ${({ theme }) => theme.palette.accent};
        }
      }
    }
  }

  .footer {
    ${({ theme }) => theme.typography.text12};

    text-align: center;
    margin-top: 21px;
    margin-bottom: 21px;

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      display: none;
    }

    a {
      ${({ theme }) => theme.typography.text12Bold};
      color: ${({ theme }) => theme.palette.accent};
      cursor: pointer;
      text-decoration: underline;

      &:hover {
        color: ${({ theme }) => theme.palette.accentLightest};
      }
    }
  }
`;
