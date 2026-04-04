import { FetchApi, UsersAPI } from "./types";
import { PREFIX } from "./";

export default (fetchApi: FetchApi): UsersAPI => ({
  get: () => fetchApi(`${PREFIX}/users`),
  getById: userId => fetchApi(`${PREFIX}/users/${userId}`),
  getCurrentUserAccessSettings: () => fetchApi(`${PREFIX}/users/access-settings`),
  getAccessSettings: userId => fetchApi(`${PREFIX}/users/${userId}/access-settings`),
  updateAccessSettings: (userId, accessSettingsDraft) =>
    fetchApi(`${PREFIX}/users/${userId}/access-settings`, {
      method: "post",
      body: JSON.stringify(accessSettingsDraft),
    }),
  getLog: userId => fetchApi(`${PREFIX}/users/${userId}/log`),
  create: userDraft =>
    fetchApi(`${PREFIX}/users`, {
      method: "post",
      body: JSON.stringify(userDraft),
    }),
  update: (userId, userDraft) =>
    fetchApi(`${PREFIX}/users/${userId}`, {
      method: "put",
      body: JSON.stringify(userDraft),
    }),
  changePassword: (email, newPasswordDraft) =>
    fetchApi(`${PREFIX}/users/${email}/password`, {
      method: "put",
      body: JSON.stringify(newPasswordDraft),
    }),
  generateCode: email => fetchApi(`${PREFIX}/users/${email}/password/reset/code`),
  confirmCode: confirmCodeDraft =>
    fetchApi(`${PREFIX}/users/password/reset/code`, {
      method: "post",
      body: JSON.stringify(confirmCodeDraft),
    }),
  resetPassword: newPasswordDraft =>
    fetchApi(`${PREFIX}/users/password/reset`, {
      method: "post",
      body: JSON.stringify(newPasswordDraft),
    }),
});
