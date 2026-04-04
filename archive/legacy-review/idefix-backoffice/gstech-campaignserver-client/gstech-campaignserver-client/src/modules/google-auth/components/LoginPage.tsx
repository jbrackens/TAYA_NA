import React from "react";
import { Link } from "react-router-dom";

import { LoginButton } from "./LoginButton";
import { getGoogleCookie } from "../utils";
import "./styles/login-page.style.css";

interface Props {
  logo?: React.ReactNode;
}

const GoogleLoginPage: React.FC<Props> = ({ logo }) => {
  const isAuthorized = getGoogleCookie();

  return (
    <div className="login-page">
      <div className="login-page__box">
        <div className="login-page__box-content">
          {logo && logo}
          <LoginButton redirectPath="/" />
        </div>
        {isAuthorized && (
          <div className="login-page__box-text">
            You are already logged in!
            <Link to="/" className="login-page__box-text-link">
              Go to Main Page
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export { GoogleLoginPage };
