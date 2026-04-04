import { Breakpoints } from "@brandserver-client/ui";
import styled from "styled-components";

export const StyledLogin = styled.div`
  .modal__content {
    max-width: 416px;
    width: 100%;
    box-shadow: ${({ theme }) => theme.shadows.loginBox};

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      max-width: 100%;
      height: 100%;
      box-shadow: unset;
      display: flex;
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
      fill: ${({ theme }) => theme.palette.secondary};
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

  .login {
    z-index: 1000;
    width: 100%;
    display: flex;
    flex: 1;
    flex-direction: column;

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      max-width: 330px;
    }

    &__title {
      ${({ theme }) => theme.typography.text30BoldUpper};
      color: ${({ theme }) => theme.palette.contrastLight};
      text-align: center;

      @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
        ${({ theme }) => theme.typography.text24Bold};
      }
    }

    &__subtitle {
      margin-top: 18px;
      text-align: center;
      ${({ theme }) => theme.typography.text16};
      color: ${({ theme }) => theme.palette.contrast};
    }

    &__tabs {
      margin-top: 28px;
    }

    &__tab-panel {
      flex: 1;
    }

    form {
      min-height: 362px;
      width: 100%;
      position: relative;
      display: flex;
      flex: 1;
      flex-direction: column;
      justify-content: space-between;

      @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
        min-height: 407px;
      }

      .input-list {
        margin-top: 40px;

        @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
          margin-top: 31px;
        }

        .input-item {
          &__alert {
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
    }

    .feedback {
      ${({ theme }) => theme.typography.text16Bold};
      margin-bottom: 40px;
      display: flex;
      justify-content: space-between;

      .feedback__forgot-password,
      a {
        cursor: pointer;
        color: ${({ theme }) => theme.palette.contrast};
        &:hover {
          color: ${({ theme }) => theme.palette.accent};
        }
      }

      @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
        ${({ theme }) => theme.typography.text12Bold};
      }

      a {
        display: none;
      }
    }

    .footer-wrap {
      @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
        display: flex;
        flex-direction: column-reverse;

        margin-top: 8px;
      }
    }

    .footer {
      ${({ theme }) => theme.typography.text12};

      text-align: center;
      margin-top: 21px;
      margin-bottom: 21px;
      color: ${({ theme }) => theme.palette.contrast};

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

      &--phone-form {
        @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
          ${({ theme }) => theme.typography.text16};
          display: block;
          margin-top: 0;
          margin-bottom: 40px;

          a {
            ${({ theme }) => theme.typography.text16Bold};
          }
        }
      }
    }
  }
`;
