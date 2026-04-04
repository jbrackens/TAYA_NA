import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import { Button } from "../components/Button";
import { NotFound as NotFoundIcon } from "../icons";

const StyledNotFound = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  max-width: 1440px;
  width: 100%;
  padding: 32px;
  margin: 64px auto 0;

  .not-found__container {
    display: flex;
  }

  .not-found__description {
    display: flex;
    flex-direction: column;
  }

  .not-found__main {
    max-width: 380px;
  }

  .not-found__sub {
    max-width: 280px;
    margin-top: 16px;
    color: ${({ theme }) => theme.palette.blackDark};
  }

  .not-found__homebutton {
    margin-top: 16px;

    a {
      text-decoration: none;
      color: ${({ theme }) => theme.palette.white};
    }
  }

  .not-found__logo {
    display: flex;
    align-items: center;
    margin-left: 70px;
  }
`;

const NotFound: React.FC = () => (
  <StyledNotFound>
    <div className="not-found__container">
      <div className="not-found__description">
        <h1 className="not-found__main text-header-big">Oops! The page you were looking for doesn’t exist.</h1>
        <h2 className="not-found__sub text-main-reg">You have misstyped the address or the page may have moved.</h2>
        <Link to="/LD/campaigns">
          <Button className="not-found__homebutton" appearance="blue">
            Go to homepage
          </Button>
        </Link>
      </div>
      <div className="not-found__logo">
        <NotFoundIcon />
      </div>
    </div>
  </StyledNotFound>
);

export default NotFound;
