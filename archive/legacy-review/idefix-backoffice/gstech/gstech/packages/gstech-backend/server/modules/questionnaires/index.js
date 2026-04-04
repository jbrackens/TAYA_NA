/* @flow */
const { getUnansweredQuestionnairesHandler, answerQuestionnaireHandler, getRequiredQuestionnairesHandler } = require('./api-routes');
const { getPlayerAnswersHandler } = require('./routes');

module.exports = {
  apiRoutes: {
    getUnansweredQuestionnairesHandler,
    answerQuestionnaireHandler,
    getRequiredQuestionnairesHandler,
  },
  routes: {
    getPlayerAnswersHandler,
  },
};
