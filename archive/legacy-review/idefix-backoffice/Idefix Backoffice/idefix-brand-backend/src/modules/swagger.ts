import fs from "fs";
import jsyaml from "js-yaml";
import { Router } from "express";
import swaggerUi, { JsonObject } from "swagger-ui-express";

const createSwaggerRouter = (swaggerFile: string) => {
  const router = Router();

  const swaggerSpec = fs.readFileSync(swaggerFile, "utf8");
  const swaggerDoc = jsyaml.load(swaggerSpec) as JsonObject;

  const options = {
    customCss: "* { outline: none !important; }"
  };

  router.use("/", swaggerUi.serveFiles(swaggerDoc, options));
  router.use("/", swaggerUi.setup(swaggerDoc, options));

  return router;
};

export { createSwaggerRouter };
