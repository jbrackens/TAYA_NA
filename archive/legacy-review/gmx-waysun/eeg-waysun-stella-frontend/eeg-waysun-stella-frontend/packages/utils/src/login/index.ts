import CryptoJS from "crypto-js";
import { getParameterById } from "./..";

export const buildSocialAuthUrl = (type: "google" | "facebook") => {
  const clientAuthUrl =
    "https://stella-dev.waysungames.com/auth/realms/waysun-test-1/protocol/openid-connect/auth";
  const responseType = "code";
  const pckeChallenge = CryptoJS.lib.WordArray.random(32).toString(
    CryptoJS.enc.Base64url,
  );
  const codeChallenge = CryptoJS.SHA256(pckeChallenge).toString(
    CryptoJS.enc.Base64url,
  );
  const codeChallengeMethod = "S256";
  const clientId = type === "google" ? "waysun-google" : "waysun-facebook";
  const redirectUri = window.location.origin + "/login";
  const scope = "openid email";
  const audience = "test_audience";
  const state = CryptoJS.lib.WordArray.random(4).toString(CryptoJS.enc.Hex);
  localStorage.setItem("pcke_verifier", pckeChallenge);
  localStorage.setItem("client_id", clientId);
  localStorage.setItem("redirect_uri", redirectUri);
  const finalUrl = `${clientAuthUrl}?response_type=${responseType}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&audience=${audience}&state=${state}`;
  return encodeURI(finalUrl);
};

export const createTokenPayload = () => {
  const pckeVerifierUserSession = localStorage.getItem("pcke_verifier");
  const clientId = localStorage.getItem("client_id");
  const redirectUri = localStorage.getItem("redirect_uri");
  const responseCode = getParameterById("code");
  let params: any = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("client_id", clientId);
  params.append("code_verifier", pckeVerifierUserSession);
  params.append("code", responseCode);
  params.append("redirect_uri", redirectUri);
  return params;
};

export const removeSocialProviderData = () => {
  localStorage.removeItem("client_id");
  localStorage.removeItem("redirect_uri");
  localStorage.removeItem("pcke_verifier");
};
