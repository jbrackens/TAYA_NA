/* @flow */
import type { PlayerBlockedResult, ComplianceProviderApi } from './types';

const checkPlayerHandler = (providers: { [string]: ComplianceProviderApi }): ((req: express$Request, res: express$Response) => Promise<void>) => async (req: express$Request, res: express$Response) => {
  // TODO: needs logging!
  const { countryId, nationalId } = req.params;

  try {
    const provider = providers[countryId];
    if (!provider) {
      throw Error(`No compliance provider found for countryId '${countryId}'`);
    }

    const response: PlayerBlockedResult = await provider.checkPlayer(nationalId);
    res.json(response);
  } catch (e) {
    const response: PlayerBlockedResult = { nationalId, isBlocked: false };
    res.json(response);
  }
};

module.exports = {
  checkPlayerHandler,
};
