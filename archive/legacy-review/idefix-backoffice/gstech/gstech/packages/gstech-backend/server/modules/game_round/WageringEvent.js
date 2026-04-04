/* @flow */
import type { WageringEvent } from 'gstech-core/modules/types/bus';
import type { GameWithProfile, Game } from '../games/Game';
import type { CounterUpdateResult } from '../limits/Counter';

const producers = require('../../producer');

const wagerWin = async (playerId: Id, brandId: BrandId, defaultConversion: Money, game: Game, win: Money, promotions: { name: string, progress: Money }[] = []) => {
  const event: WageringEvent = {
    permalink: game.permalink,
    playerId,
    brandId,
    bet: 0,
    win: win / defaultConversion,
    promotions: promotions.map(({ name, progress }) => ({
      name: name || '',
      value: progress,
      contribution: 0,
    })),
  };
  const producer = await producers.lazyProducingWageringEventProducer();
  await producer(event);
};

const wagerBet = async (playerId: Id, brandId: BrandId, defaultConversion: Money, game: GameWithProfile, bet: Money, win: Money, promotions: CounterUpdateResult[] = []) => {
  const event: WageringEvent = {
    permalink: game.permalink,
    playerId,
    brandId,
    bet: bet / defaultConversion,
    win: win / defaultConversion,
    promotions: promotions.filter(({ type }) => type === 'promotion').map(({ name, progress, contribution }) => ({
      name: name || '',
      value: progress,
      contribution,
    })),
  };
  const producer = await producers.lazyProducingWageringEventProducer();
  await producer(event);
};

module.exports = {
  wagerBet,
  wagerWin,
};
