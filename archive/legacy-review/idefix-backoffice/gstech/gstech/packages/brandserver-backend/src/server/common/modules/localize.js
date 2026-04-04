/* @flow */
const localization = require('../localization');

const localize = (req: express$Request, key: string, values: any, options?: any): any | void | string => localization.localize(req.context.languageISO)(key, values, options);

module.exports = { localize };
