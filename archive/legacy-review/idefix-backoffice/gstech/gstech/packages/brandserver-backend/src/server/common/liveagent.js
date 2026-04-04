/* @flow */
import type { Journey } from './api';

const configuration = require('./configuration');

const clientConfig = (journey: Journey): {
  id: string,
  script: string,
  buttonId: string,
  params: Array<{name: string, value: string}>,
  visitor: { email: any, name: string },
} => {
  const lang = journey.req.context.languageISO.toLowerCase();
  const customVariables = [{ name: 'Site', value: configuration.productionMode() ? configuration.project().toUpperCase() : `DEVELOPMENT ${configuration.project().toUpperCase()}` }, { name: 'Currency', value: journey.req.context.currencyISO }, { name: 'Language', value: lang }];

  if (journey.req.user) {
    customVariables.push({ name: 'username', value: journey.req.user.username });
    if (journey.level != null) {
      customVariables.push({
        name: 'jefe_level',
        value: String(journey.level()),
      });
    }
  }
  const visitor = journey.req.user && {
    email: journey.req.user.email,
    name: journey.req.user.details.FirstName,
  };

  return {
    id: configuration.liveAgent.id,
    script: configuration.liveAgent.script,
    buttonId: journey.req.user ? configuration.liveAgent.loggedin(lang) : configuration.liveAgent.nonloggedin(lang),
    visitor,
    params: customVariables,
  };
};

module.exports = {
  clientConfig,
};
