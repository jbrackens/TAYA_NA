/* eslint-disable jsx-a11y/anchor-is-valid */
import { Breakpoints, useRegistry } from "@brandserver-client/ui";
import { CloseIcon } from "@brandserver-client/icons";
import cn from "classnames";
import Router from "next/router";
import * as React from "react";
import { FormattedMessage } from "react-intl";
import styled from "styled-components";
import { useLockBodyScroll } from "@brandserver-client/hooks";

const StyledFormWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 50px 0;
  width: 100%;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    padding: 0;
    justify-content: flex-start;
  }

  .fullscreen-wrapper__header {
    margin-bottom: 20px;
    min-height: 24px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      position: relative;
      display: flex;
      justify-content: center;
      width: 100%;

      margin-bottom: 30px;
    }
  }

  .fullscreen-wrapper__child-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 328px;
    min-height: 462px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      width: 100%;
      min-height: initial;
      height: 100%;
    }
  }

  h1 {
    ${({ theme }) => theme.typography.text30BoldUpper}
    text-align: center;
    white-space: nowrap;
    margin-bottom: 24px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)},
      (max-height: 800px) {
      ${({ theme }) => theme.typography.text24Bold}
      width: 100%;
      white-space: initial;
      overflow-wrap: break-word;
      text-align: start;
    }

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      text-align: center;
    }
  }

  a {
    color: ${({ theme }) => theme.palette.accent};
    cursor: pointer;
    text-decoration: underline;

    &:hover {
      color: ${({ theme }) => theme.palette.accentLightest};
    }
  }

  .fullscreen-wrapper__close-icon {
    position: absolute;
    width: 20px;
    height: 20px;
    top: 20px;
    right: 20px;
    fill: ${({ theme }) => theme.palette.secondary};
    cursor: pointer;

    &:hover {
      fill: ${({ theme }) => theme.palette.accent};
    }

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      top: 0;
      right: 0;
    }
  }

  .fullscreen-wrapper__logo {
    position: absolute;
    top: 20px;
    left: 20px;

    display: block;

    width: 109px;
    height: 40px;
    cursor: pointer;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      display: none;
    }
  }

  .fullscreen-wrapper__footer {
    margin-top: 20px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      display: none;
    }
  }

  .fullscreen-wrapper__footer--hidden {
    visibility: hidden;
  }

  .fullscreen-wrapper__footer-link {
    font-weight: bold;
    text-decoration: none;
  }
`;

interface Props {
  activeStep?: number;
  children: React.ReactNode;
  onClose: () => void;
  onReturnToStep?: (step: number) => void;
  footer?: boolean;
}

const FullscreenFormWrapper: React.FC<Props> = ({
  activeStep,
  children,
  onClose,
  onReturnToStep,
  footer = true
}) => {
  const { Stepper } = useRegistry();
  const language = "en";

  useLockBodyScroll(true);

  return (
    <StyledFormWrapper>
      <div className="fullscreen-wrapper__header">
        {activeStep && onReturnToStep && (
          <Stepper activeStep={activeStep} onReturn={onReturnToStep} />
        )}
        <CloseIcon
          className={`fullscreen-wrapper__close-icon`}
          onClick={onClose}
        />
        <img
          className="fullscreen-wrapper__logo"
          src="/icons/logo.svg"
          alt="logo"
          onClick={onClose}
        />
      </div>
      {children &&
        React.cloneElement(children as React.ReactElement, {
          className: "fullscreen-wrapper__child-container"
        })}
      <FormattedMessage id="lander.already-have-an-account">
        {(message: string[]) => {
          const messageParts = message[0].split("? ");
          return (
            <div
              className={cn("fullscreen-wrapper__footer", {
                "fullscreen-wrapper__footer--hidden": !footer
              })}
            >
              {`${messageParts[0]}? `}
              <a
                className="fullscreen-wrapper__footer-link"
                onClick={() => {
                  onClose();
                  Router.push(
                    `/?lang=${language}&login=true`,
                    `/${language}/login`
                  );
                }}
              >
                {messageParts[1]}
              </a>
            </div>
          );
        }}
      </FormattedMessage>
    </StyledFormWrapper>
  );
};

export { FullscreenFormWrapper };
