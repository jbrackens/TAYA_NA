import * as React from "react";
import styled from "styled-components";
import cn from "classnames";
import { Breakpoints } from "../../breakpoints";

const StyledSnackbar = styled.div`
  .snackbar {
    display: flex;
    justify-content: space-between;
    width: 100%;
    height: 100%;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      flex-direction: column;
    }

    &--modal {
      flex-direction: column;
    }
  }

  .snackbar__text {
    padding: 11px 20px;
    display: flex;
    justify-content: center;
    flex-direction: column;
    white-space: pre-wrap;
  }

  .snackbar__title {
    ${({ theme }) => theme.typography.text14Bold};
    color: ${({ theme }) => theme.palette.accent};
    margin-bottom: 8px;
  }

  .snackbar__content {
    ${({ theme }) => theme.typography.text14};
    color: ${({ theme }) => theme.palette.primary};
    white-space: pre-wrap;
  }

  .separator {
    height: 1px;
    width: inherit;
    background-color: rgba(63, 63, 63, 0.2);

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      width: 1px;
      height: inherit;
      background-color: rgba(63, 63, 63, 0.2);
    }

    &--modal {
      width: 1px;
      height: inherit;
      background-color: rgba(63, 63, 63, 0.2);
    }
  }

  .snackbar__buttons {
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    border-left: 1px solid rgba(63, 63, 63, 0.2);

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      width: 100%;
      flex-direction: row;
      border-top: 1px solid rgba(63, 63, 63, 0.2);
      border-left: none;
    }

    &--modal {
      width: 100%;
      flex-direction: row;
      border-top: 1px solid rgba(63, 63, 63, 0.2);
      border-left: none;
    }
  }

  .snackbar__button {
    flex: 1;
    width: 100%;
    height: 100%;
    min-width: 110px;
    border: none;
    color: ${({ theme }) => theme.palette.accent};
    background: inherit;
    cursor: pointer;
    outline: none;

    &:hover {
      background: ${({ theme }) => theme.palette.accentLightest};
      color: ${({ theme }) => theme.palette.contrast};
    }

    &:active {
      background: ${({ theme }) => theme.palette.accent};
      color: ${({ theme }) => theme.palette.contrast};
    }
  }

  .snackbar__button--close {
    border-radius: 0 10px 10px 0;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      border-radius: 0 0 10px 10px;
    }

    &--modal {
      border-radius: 0 0 0 10px;

      &--solo {
        border-radius: 0 0 10px 10px;
      }
    }
  }

  .snackbar__button--action {
    border-radius: 0 0 10px 0;

    &--modal {
      &--solo {
        border-radius: 0 0 10px 10px;
      }
    }
  }

  .snackbar__button-text {
    ${({ theme }) => theme.typography.text14Bold};
    padding: 13px 0;

    &--thin {
      ${({ theme }) => theme.typography.text14};
    }
  }
`;

export interface SnackbarProps {
  content: string;
  closeToast?: () => void;
  title?: string;
  action?: {
    actionTitle: string;
    onActionClick: () => void;
  };
  close?: {
    closeTitle: string;
    onClose?: () => void;
  };
  isModal?: boolean;
  onCloseAction?: () => void;
}

const Snackbar: React.FC<SnackbarProps> = ({
  content,
  closeToast,
  title,
  action,
  close,
  isModal,
  onCloseAction
}) => {
  React.useEffect(() => {
    if (onCloseAction) {
      return () => onCloseAction();
    }
  }, []);

  return (
    <StyledSnackbar>
      <div
        className={cn("snackbar", {
          "snackbar--modal": isModal
        })}
      >
        <div className="snackbar__text">
          {title && <div className="snackbar__title">{title}</div>}
          <div className="snackbar__content">{content}</div>
        </div>
        {(action || close) && (
          <div
            className={cn("snackbar__buttons", {
              "snackbar__buttons--modal": isModal
            })}
          >
            {close && (
              <button
                className={cn("snackbar__button snackbar__button--close", {
                  "snackbar__button--modal snackbar__button--close--modal":
                    isModal,
                  "snackbar__button--close--modal--solo": isModal && !action
                })}
                onClick={close.onClose ? close.onClose : closeToast}
              >
                <div
                  className={cn("snackbar__button-text", {
                    "snackbar__button-text--thin": !!action
                  })}
                >
                  {close.closeTitle}
                </div>
              </button>
            )}
            {action && close && (
              <div
                className={cn("separator", {
                  "separator--modal": isModal
                })}
              />
            )}
            {action && (
              <button
                className={cn("snackbar__button snackbar__button--action", {
                  "snackbar__button--modal snackbar__button--action--modal":
                    isModal,
                  "snackbar__button--action--modal--solo": isModal && !close
                })}
                onClick={action.onActionClick}
              >
                <div
                  className={cn("snackbar__button-text", {
                    "snackbar__button-text--modal": isModal
                  })}
                >
                  {action.actionTitle}
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </StyledSnackbar>
  );
};

export { Snackbar };
