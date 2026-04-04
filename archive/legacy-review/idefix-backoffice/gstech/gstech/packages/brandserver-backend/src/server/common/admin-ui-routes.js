/* @flow */
const express = require('express');
const moment = require('moment-timezone');
const path = require('path');
const configuration = require('./configuration');
const utils = require('./utils');

const fullLanguages = require('./localization').languages;

const rel = (name: string): string => path.join(__dirname, `../../../${name}`);

const bind = (app: express$Application<express$Request, express$Response>) => {
  app.get('/admin/', (req: express$Request, res: express$Response) => {
    const props = {
      configuration,
      languages: fullLanguages,
      projectName: utils.capitalize(configuration.project()),
      moment,
    };
    res.render('../admin/index', props);
  });

  app.use('/admin/', express.static(rel('public/admin'), { maxAge: 1000 * 10 }));
};

module.exports = { bind };
