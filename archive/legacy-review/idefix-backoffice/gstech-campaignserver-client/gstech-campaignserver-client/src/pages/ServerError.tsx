import * as React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

import { ServerError as ServerErrorIcon } from "../icons";
import { Button } from "../components/Button";

const StyledServerError = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  max-width: 1440px;
  padding: 32px;
  margin: 64px auto 0;

  .server-error__container {
    display: flex;
  }

  .server-error__description {
    display: flex;
    flex-direction: column;
  }

  .server-error__main {
    max-width: 380px;
  }

  .server-error__sub {
    max-width: 280px;
    margin-top: 16px;
    color: ${({ theme }) => theme.palette.blackDark};
  }

  .server-error__homebutton {
    margin-top: 16px;
  }

  .server-error__logo {
    display: flex;
    align-items: center;
    margin-left: 70px;
  }
`;

const ServerError: React.FC = () => (
  <StyledServerError>
    <div className="server-error__container">
      <div className="server-error__description">
        <h1 className="server-error__main text-header-big">Oops! Something went wrong at our end.</h1>
        <h2 className="server-error__sub text-main-reg">
          Don't worry, it's not you - it's us. Try to click button below.
        </h2>
        <Link to="/LD/campaigns">
          <Button className="server-error__homebutton" appearance="blue">
            Go to homepage
          </Button>
        </Link>
      </div>
      <div className="server-error__logo">
        <ServerErrorIcon />
      </div>
    </div>
  </StyledServerError>
);

export default ServerError;
