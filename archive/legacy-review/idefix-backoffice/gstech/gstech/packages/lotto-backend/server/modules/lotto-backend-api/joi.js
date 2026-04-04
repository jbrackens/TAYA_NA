/* @flow */
const joi = require('joi');

const buyTicket: any = joi.object({
  gameid: joi.string().trim().required(),
  drawings: joi.number().required(),
  details: joi.array().items({
    ordernr: joi.number().required(),
    betnumbers: joi.array().items(joi.number()).required(),
    betbonusnumbers: joi.array().items(joi.number()).required(),
  }).required(),
});

module.exports = {
  buyTicket,
};
