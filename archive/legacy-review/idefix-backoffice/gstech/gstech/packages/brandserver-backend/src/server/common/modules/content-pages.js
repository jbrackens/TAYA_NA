/* @flow */
import type { LangDef } from '../api';

const fs = require('fs');
const _ = require('lodash');
const logger = require('../logger');
const { localize, findLanguage } = require('../localization');
const utils = require('../utils');

const {
  common,
} = require('../router-helpers');

const pathMapping = {
  tc: 'navigation.terms-conditions',
  privacypolicy: 'privacypolicy',
  bonusterms: 'navigation.bonusterms',
};

const getContentPageHandler = async (req: express$Request, res: express$Response): Promise<void> => {
  const { lang }: { lang: LangDef } = (req.params: any);
  utils.initContext(req, res, req.user, lang);
  const file = `${__dirname}/../../../markdown/common/${req.params.lang}/${req.params.page}.md`;
  return fs.readFile(file, (err, file) => {
    if (err != null) {
      res.sendStatus(404);
      return;
    }
    const columnBegin = _.template('<div class="content-column <%- extras %>">');
    const columnEnd = '</div>';

    const itms = utils.populate(file.toString(), utils.localizeDefaults(req.context), 'markdown').split('<hr>');
    const content = [`<div class="content-header content-${req.params.page}"/><div class="content-column-wrapper content-${req.params.page} columns${itms.length - 2}">`];
    for (let index = 0; index < itms.length; index++) {
      const block = itms[index];
      const extras = [];
      if (index === 0) {
        extras.push('first');
      } else if (index === itms.length - 1) {
        extras.push('last');
      } else {
        extras.push(`column-${index} `);
      }
      content.push(columnBegin({ extras: extras.join(' ') }));
      content.push(block);
      content.push(columnEnd);
    }
    content.push('</div>');
    // $FlowFixMe[invalid-computed-prop]
    const title = localize(req.params.lang)(pathMapping[req.params.page] || '');
    res.json({ content: content.join(''), title });
  });
}

const getDialogPageHandler =  (req: express$Request, res: express$Response) => {
  utils.initContext(req, res, req.user, { code: req.params.lang });
  res.render(`dialog/${req.params.page}`, common(findLanguage(req.params.lang), req, res), (err, content) => {
    if (err != null) {
      logger.warn('Page not found', req.params.page, err);
      return res.sendStatus(404);
    }
    return res.json({ content });
  });
};

const getContentIframeHandler = (req: express$Request, res: express$Response) => {
  utils.initContext(req, res, req.user, { code: req.params.lang });
  res.render(`dialog/${req.params.page}`, common(findLanguage(req.params.lang), req, res), (err, content) => {
    if (err != null) {
      return res.sendStatus(404);
    }
    return res.send(content);
  });
};

module.exports = {
  getContentPageHandler,
  getDialogPageHandler,
  getContentIframeHandler,
};
