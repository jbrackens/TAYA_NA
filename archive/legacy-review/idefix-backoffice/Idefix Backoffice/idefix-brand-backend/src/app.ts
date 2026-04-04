import path from "path";
import express from "express";
import bodyParser from "body-parser";
import { createSwaggerRouter } from "./modules/swagger";

const PORT = 5000;
const app = express();
const swaggerPath = path.resolve(
  __dirname,
  "./swagger/idefix-backend-api.yaml"
);

app.use(bodyParser.json());
app.use("/api/v1/docs", createSwaggerRouter(swaggerPath));

app.listen(PORT, () => console.log(`Server is listening on port: ${PORT}`));
