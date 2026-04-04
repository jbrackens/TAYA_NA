/* @flow */
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const jsyaml = require('js-yaml');
const { Router } = require('express');

const createSwaggerRouter = (swaggerFile: string): Router<> => {
  const router: Router<> = Router();  
  const swaggerSpec = fs.readFileSync(swaggerFile, 'utf8');
  const swaggerDoc = jsyaml.load(swaggerSpec);

  const options = {
    customCss: '.markdown { margin-top: -2px; font-size: 14px; } .response-col_status { padding-top: 22px !important; font-weight: bold; }',
  };

  router.use('/', swaggerUi.serveFiles(swaggerDoc, options));
  router.use('/', swaggerUi.setup(swaggerDoc, options));

  return router;
};

module.exports = {
  createSwaggerRouter,
};
