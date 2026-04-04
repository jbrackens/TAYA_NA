import * as React from "react";
import "./styles/google-user.style.css";
import { getGoogleAccount } from "../utils";

const GoogleUser: React.FC = () => {
  const account = getGoogleAccount();

  if (account) {
    return (
      <div className="google-user">
        <div className="google-user__email">{account.email}</div>
        <img src={account.picture} alt="avatar-image" className="google-user__avatar" />
      </div>
    );
  }

  return null;
};

export { GoogleUser };
