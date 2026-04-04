/* @flow */
const validate = require('gstech-core/modules/validate');
const joi = require('gstech-core/modules/joi');

type RandomDefinition = { weight: number, [key: string]: any };

const brandIdParamHandler = (req: express$Request, res: express$Response, next: () => mixed, brandId: string) => {
  try {
    validate(brandId, joi.string().trim().length(2).required());
    req.brandId = ((brandId: any): BrandId);
    next();
  } catch (e) {
    res.json({ error: { message: 'brandId param required' } });
  }
};

const gameTagMapper = (object: any): any => {
  if (object.game) {
    const copy = { ...object };
    copy.game.tags = Object.keys(copy.game.tags);
    return copy;
  }
  return object;
}

const weightedRandom = (weights: RandomDefinition[]): RandomDefinition => {
  let sum = 0;
  const rand = Math.random();
  for (const row of weights) {
    sum += row.weight;
    if (rand <= sum) return row;
  }
  throw new Error('Incorrect weights array');
};

module.exports = {
  brandIdParamHandler,
  gameTagMapper,
  weightedRandom,
};
