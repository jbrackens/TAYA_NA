/* @flow */
const joi = require('joi');

const generalSchema: any = joi.object({
  request_type: joi.string().trim().required(),
  secret: joi.string().trim().required(),
  requestid: joi.number().required(),
  data: joi.object().required(),
}).options({ stripUnknown: true });

const drawingwinnersSchema: any = joi.object({
  batchnumber: joi.number().required(),
  drawid: joi.number().required(),
  is_last_batch: joi.number().required(),
  winners: joi.array().items({
    betid: joi.number().required(),
    correctnumbers: joi.number().required(),
    correctextranumbers: joi.number().required(),
    correctbonusnumbers: joi.number().required(),
    correctrefundnumbers: joi.number().required(),
    payout: joi.number().required(),
    payoutcurrency: joi.string().trim().required(),
    payoutusercurrency: joi.number().required(),
    usercurrency: joi.string().trim().required(),
    drawingsremaining: joi.number().required(),
    externalid: joi.string().trim().required(),
    externaluserid: joi.string().trim().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const gametypeupdateSchema: any = joi.object({
  gametypeid: joi.string().trim().required(),
  name: joi.string().trim().required(),
  currency: joi.string().trim().required(),
  cutoffhours: joi.string().trim().required(),
  isplayable: joi.string().trim().required(),
  country: joi.string().trim().required(),
  continent: joi.string().trim().required(),
  numbers: joi.string().trim().required(),
  numbermin: joi.string().trim().required(),
  numbermax: joi.string().trim().required(),
  extranumbers: joi.string().trim().required(),
  bonusnumbers: joi.string().trim().required(),
  bonusnumbermin: joi.string().trim().required(),
  bonusnumbermax: joi.string().trim().required(),
  refundnumbers: joi.string().trim().required(),
  refundnumbermin: joi.string().trim().required(),
  refundnumbermax: joi.string().trim().required(),
}).options({ stripUnknown: true });

const fxupdateSchema: any = joi.object({
  currencies: joi.array().items({
    currency_code: joi.string().trim().required(),
    fx_rate: joi.string().trim().required(),
  }).options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const drawingupdateSchema: any = joi.object({
  drawid: joi.number().required(),
  gametypeid: joi.number().required(),
  drawdateutc: joi.string().trim().required(),
  drawdatelocal: joi.string().trim().required(),
  jackpotsize: joi.number().required(),
  jackpotcurrency: joi.string().trim().required(),
  numbers: joi.array().items(joi.number()).required(),
  extranumbers: joi.array().items(joi.number()).required(),
  bonusnumbers: joi.array().items(joi.number()).required(),
  refundnumbers: joi.array().items(joi.number()).required(),
}).options({ stripUnknown: true });

const drawingpayouttableSchema: any = joi.object({
  drawid: joi.number().required(),
  payout_table: joi.array().items({
    numbers: joi.number().required(),
    extranumbers: joi.number().required(),
    bonusnumbers: joi.number().required(),
    refundnumbers: joi.number().required(),
    probability: joi.number().required(),
    payout: joi.number().required(),
    payoutcurrency: joi.string().trim().required(),
    sortorder: joi.number().required(),
    id: joi.number().required(),
  }).options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  generalSchema,
  drawingwinnersSchema,
  gametypeupdateSchema,
  fxupdateSchema,
  drawingupdateSchema,
  drawingpayouttableSchema,
};
