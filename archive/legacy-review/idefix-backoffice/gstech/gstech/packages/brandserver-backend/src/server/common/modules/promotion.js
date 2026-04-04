/* @flow */


const biApi = require('../bi-api');

const optInToPromotion = (req: express$Request, promotionID: string): Promise<any> => biApi.PromotionOptInPromotion(req, { promotionID });

module.exports = { optInToPromotion };
