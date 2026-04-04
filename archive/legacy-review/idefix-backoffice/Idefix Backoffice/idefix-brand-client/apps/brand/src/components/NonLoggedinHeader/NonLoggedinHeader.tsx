import React, { FC } from "react";
import styled from "styled-components";
import { useDispatch } from "react-redux";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { useRouter } from "next/router";
import { useMessages } from "@brandserver-client/hooks";
import { changeLoginOpen } from "@brandserver-client/lobby";

interface Props {
  hideLoginAndRegisterButtons: boolean;
}

const NonLoggedInHeader: FC<Props> = ({ hideLoginAndRegisterButtons }) => {
  const { query } = useRouter();
  const dispatch = useDispatch();

  const { Logo, Button, ButtonLink } = useRegistry();

  const messages = useMessages({
    signup: "register.title",
    login: "login.action"
  });

  const handleOpenLogin = React.useCallback(
    () => dispatch(changeLoginOpen(true)),
    [dispatch]
  );

  return (
    <StyledNonLoggedInHeader>
      {/* We should use the tag a instead of next/link here to reload a page because of using cms headfull page in the response of cms content */}
      <a href={`/?lang=${query.lang}`}>
        <Logo />
      </a>
      <div className="NonLoggedInHeader__actions">
        {!hideLoginAndRegisterButtons && (
          <>
            <Button
              className="NonLoggedInHeader__login-button"
              color={Button.Color.primaryLightest2}
              onClick={handleOpenLogin}
            >
              {messages.login}
            </Button>
            <ButtonLink
              className="NonLoggedInHeader__register-button"
              id="registration-cta"
              href={`/?lang=${query.lang}`}
              as={`/${query.lang}`}
            >
              {messages.signup}
            </ButtonLink>
          </>
        )}
      </div>
    </StyledNonLoggedInHeader>
  );
};

const StyledNonLoggedInHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80px;
  padding: 20px;
  background: ${({ theme }) => theme.palette.primary};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: ${({ theme }) => theme.zIndex.header};

  .NonLoggedInHeader__actions {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .NonLoggedInHeader__categories {
    justify-content: flex-end;

    @media (max-width: 1124px) {
      width: 384px;
      justify-content: space-evenly;
    }
  }

  .NonLoggedInHeader__register-button {
    margin-left: 20px;
    width: 112px;
  }

  .NonLoggedInHeader__login-button {
    padding: 10px;
    margin-left: 44px;
    line-height: 20px;
    width: 112px;
  }

  @media (max-width: 1040px) {
    .NonLoggedInHeader__register-button,
    .NonLoggedInHeader__login-button {
      margin-left: 10px;
    }
  }

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    padding: 10px;
  }

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.bigMobile)} {
    .NonLoggedInHeader__register-button,
    .NonLoggedInHeader__login-button {
      width: 80px;
    }
  }
`;

export { NonLoggedInHeader };
