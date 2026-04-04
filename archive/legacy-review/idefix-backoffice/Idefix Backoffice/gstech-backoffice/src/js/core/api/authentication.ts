import { FetchApi, AuthenticationAPI } from "./types";
import { PREFIX } from "./";

export default (fetchApi: FetchApi): AuthenticationAPI => ({
  login: ({ email, password }) =>
    fetchApi(`${PREFIX}/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    fetchApi(`${PREFIX}/logout`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  expirePassword: () =>
    fetchApi(`${PREFIX}/expire-password`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
});
