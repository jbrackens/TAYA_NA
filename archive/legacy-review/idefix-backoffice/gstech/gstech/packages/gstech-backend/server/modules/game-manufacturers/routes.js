/* @flow */

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');

const schemas = require('./schemas');
const GameManufacturer = require('./GameManufacturer');

const getGameManufacturerHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const { gameManufacturerId } = req.params;

    const gameManufacturer = await GameManufacturer.getGameManufacturer(gameManufacturerId);
    return res.status(200).json(gameManufacturer);
  } catch (err) {
    logger.warn('Get game manufacturer failed');
    return next(err);
  }
};

const getGameManufacturersHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const { countryId } = validate(req.query, schemas.getGameManufacturersSchema);

    const manufacturers = await GameManufacturer.getGameManufacturers(countryId);
    return res.status(200).json(manufacturers);
  } catch (err) {
    logger.warn('Get game manufacturers');
    return next(err);
  }
};

const updateGameManufacturerHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const { gameManufacturerId } = req.params;
    const update = await validate(req.body, schemas.updateGameManufacturerSchema);

    await GameManufacturer.updateGameManufacturer(gameManufacturerId, update);
    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.warn('Update game manufacturer failed');
    return next(err);
  }
};

module.exports = {
  getGameManufacturerHandler,
  getGameManufacturersHandler,
  updateGameManufacturerHandler,
};
