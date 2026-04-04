import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { GoogleAccount } from "./types";

export const COOKIE_NAME = "Google_Authorization";
export const redirect = (path: string) => (window.location.href = path);

export const getGoogleCookie = () => Cookies.get(COOKIE_NAME);
export const setGoogleCookie = (value: string) => Cookies.set(COOKIE_NAME, value, { expires: 1 / 24 });
export const removeGoogleCookie = () => Cookies.remove(COOKIE_NAME);

export const getGoogleAccount = () => {
  const token = getGoogleCookie();

  if (token) {
    const account: GoogleAccount = jwtDecode(token);

    return account;
  }

  return null;
};

export const getGoogleClientId = () =>
  (window.location.hostname.includes("dev.eeg.viegg.net")
    ? process.env.REACT_APP_BETA_GOOGLE_CLIENT_ID
    : process.env.REACT_APP_GOOGLE_CLIENT_ID) || "";
