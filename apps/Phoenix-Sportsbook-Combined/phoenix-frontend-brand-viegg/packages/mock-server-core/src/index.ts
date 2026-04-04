import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import profileRouter from "./routes/profile";
import fixtureRouter from "./routes/fixture";
import adminRouter from "./routes/admin";
import betRouter from "./routes/bet";
import gamesRouter from "./routes/games";
import transactionsHistoryRouter from "./routes/transactionHistory";
import winLossStatisticsRouter from "./routes/winLossStatistics";
import errorRouter from "./routes/error";
import punterRouter from "./routes/punters";
const WebSocket = require("ws");
import { websocketHandler } from "./websocketHandlers/websocket";
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
app.use("/", authRouter());
app.use("/profile", profileRouter());
app.use("/fixtures", fixtureRouter());
app.use("/admin", adminRouter());
app.use("/pool-bet", betRouter());
app.use("/sports", gamesRouter());
app.use("/punters/wallet/transactions", transactionsHistoryRouter());
app.use("/win-loss-statistics", winLossStatisticsRouter());
app.use("/error", errorRouter());
app.use("/punters", punterRouter());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
wss.on("connection", (client: any) => websocketHandler(client));

server.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
