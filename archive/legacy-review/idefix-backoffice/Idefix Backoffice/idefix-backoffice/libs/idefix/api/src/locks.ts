import { FetchApi, LocksAPI } from "./types";
import { PREFIX } from "./";

export default (fetchApi: FetchApi): LocksAPI => ({
  get: () => fetchApi(`${PREFIX}/locks`),
  lock: playerId =>
    fetchApi(`${PREFIX}/locks/${playerId}`, {
      method: "put",
    }),
  steal: playerId =>
    fetchApi(`${PREFIX}/locks/${playerId}/steal`, {
      method: "put",
    }),
  release: playerId =>
    fetchApi(`${PREFIX}/locks/${playerId}`, {
      method: "delete",
    }),
});
