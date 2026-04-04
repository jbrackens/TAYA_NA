import React from "react";
import cn from "classnames";
import styled, { ThemeContext } from "styled-components";
import { Notification } from "@brandserver-client/types";
import { useRegistry } from "@brandserver-client/ui";
import { ApiContext } from "@brandserver-client/api";
import { pushRoute } from "@brandserver-client/utils";

const StyledNotification = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 10px;
  background: ${({ theme }) => theme.palette.primaryLight};
  overflow: hidden;
  @media only screen and (max-width: 768px) {
    max-width: 100%;
  }

  .notification-wrapper {
    max-width: 680px;

    &--myaccount {
      max-width: 100%;
    }
  }

  .notification__text {
    margin-top: 36px;
    padding: 0px 40px;
    @media only screen and (max-width: 768px) {
      padding: 0px 24px;
      margin-top: 22px;
    }

    &--myaccount {
      padding: 0px;
      @media only screen and (max-width: 768px) {
        padding: 0 4px;
      }
    }
  }

  .notification__title {
    ${({ theme }) => theme.typography.text24Bold}
    color: ${({ theme }) => theme.palette.contrastLight};
  }

  .notification__image {
    border-radius: 10px 10px 0px 0px;
    width: 100%;

    &--myaccount {
      border-radius: 10px;
      margin-top: 40px;
      @media only screen and (max-width: 768px) {
        margin-top: 22px;
      }
    }
  }

  .notification__content {
    margin-top: 16px;
    font-size: 16px;
    line-height: 28px;
    color: ${({ theme }) => theme.palette.contrastDark};

    &.disclaimer {
      color: ${({ theme }) => theme.palette.secondaryDark};
      font-style: italic;
      ${({ theme }) => theme.typography.text14};
    }

    h1 {
      text-align: center;
      font-size: 32px;
      line-height: 34px;
    }

    h2 {
      font-size: 22px;
    }

    h3 {
      font-size: 18px;
    }

    p {
      margin-bottom: 12px;

      a {
        color: ${({ theme }) => theme.palette.accent};
        font-weight: 600;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
      &:last-child {
        margin-bottom: 0px;
      }
    }

    ul,
    ol {
      margin-top: 0;
      margin-bottom: 10px;
    }

    ol,
    ol > li {
      margin-top: 1px;
      margin-left: 20px;

      list-style: decimal;
    }

    ul,
    ul > li {
      margin-top: 1px;
      margin-left: 20px;

      list-style-type: initial;
    }

    h1,
    h2,
    h3 {
      margin: 10px 0px;
    }
  }

  .notification__button {
    display: none;

    @media only screen and (max-width: 768px) {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      border-radius: unset;
    }

    &--myaccount {
      display: flex;
      position: static;
      align-self: flex-start;
      margin: 40px 0 31px;
      width: 324px;
      border-radius: 5px;

      @media only screen and (max-width: 768px) {
        margin: 40px 0 24px;
        align-self: center;
        width: 100%;
      }
    }
  }
`;

interface Props {
  notification: Notification;
  isMyAccount?: boolean;
}

const NotificationMessage: React.FC<Props> = ({
  notification: { action, actiontext, image, title, content, disclaimer },
  isMyAccount
}) => {
  const theme = React.useContext(ThemeContext);
  const api = React.useContext(ApiContext);
  const { Button, FullScreenNotificationFooter } = useRegistry();
  const [imageValid, setImageValid] = React.useState<boolean>(true);

  const handleResendLink = React.useCallback(() => {
    if (!action || action === "") {
      return;
    }

    if (action.includes("https://")) {
      return window.open(action, "_blank");
    }

    if (action.includes("/api/")) {
      return api.notifications
        .resendLink(action)
        .then(() => pushRoute("/loggedin/myaccount/inbox"));
    }

    return pushRoute(action);
  }, [action]);

  return (
    <StyledNotification>
      <div
        className={cn("notification-wrapper", {
          "notification-wrapper--myaccount": isMyAccount
        })}
      >
        {image && imageValid && (
          <img
            className={cn("notification__image", {
              "notification__image--myaccount": isMyAccount
            })}
            src={`${theme.cdn}b/notifications/${image}`}
            srcSet={`${theme.cdn}b/notifications/${
              image.split(".")[0]
            }@2x.jpg 2x`}
            alt="notification-image"
            onError={() => setImageValid(false)}
          />
        )}
        <div
          className={cn("notification__text", {
            "notification__text--myaccount": isMyAccount
          })}
        >
          <div className="notification__title">{title}</div>
          <div
            className="notification__content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
          {action && action !== "" && (
            <>
              <Button
                color={Button.Color.accent}
                size={Button.Size.large}
                className={cn("notification__button", {
                  "notification__button--myaccount": isMyAccount
                })}
                onClick={handleResendLink}
              >
                {actiontext}
              </Button>
              {disclaimer && (
                <div
                  className="notification__content disclaimer"
                  dangerouslySetInnerHTML={{
                    __html: disclaimer
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
      {action && action !== "" && !isMyAccount && (
        <FullScreenNotificationFooter
          title={title}
          actionText={actiontext}
          onClick={handleResendLink}
        />
      )}
    </StyledNotification>
  );
};

export { NotificationMessage };
