import { FetchApi, ReportsAPI } from "./types";
import { PREFIX } from "./";

export default (fetchApi: FetchApi): ReportsAPI => ({
  getReport: (type, values) =>
    fetchApi(`${PREFIX}/reports/${type}`, {
      method: "POST",
      body: JSON.stringify(values),
    }),
});
