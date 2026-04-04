/* @flow */
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const jsyaml = require('js-yaml');
const { Router } = require('express');

const createSwaggerRouter = (swaggerFile: string): express$Router<> => {
  const router: express$Router<> = Router(); // eslint-disable-line
  const swaggerSpec = fs.readFileSync(swaggerFile, 'utf8');
  const swaggerDoc = jsyaml.safeLoad(swaggerSpec);

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
