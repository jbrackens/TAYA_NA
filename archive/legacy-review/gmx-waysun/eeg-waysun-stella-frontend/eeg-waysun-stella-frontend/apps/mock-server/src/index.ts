import express from "express";
import cors from "cors";
import aggregationRouter from "./routes/aggregationRouter";
import eventRouter from "./routes/eventRouter";
import achievementRouter from "./routes/achievementRouter";
import leaderboardRouter from "./routes/leaderboardRouter";
import currencyRouter from "./routes/currencyRouter";

const http = require("http");
const bodyParser = require("body-parser");
const app = express();
const port = 3010;

app.use(cors({ origin: "http://localhost:3000" }));
// use it before all route definitions
// @ts-ignore
app.get("/", (req: any, res: any) => {
  res.send({ ok: "true" });
});

app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use("/rule_configurator/aggregations", aggregationRouter());
app.use("/rule_configurator/events", eventRouter());
app.use("/", achievementRouter());
app.use("/leaderboard/aggregations", leaderboardRouter());
app.use("/wallet/admin/currencies", currencyRouter());

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
