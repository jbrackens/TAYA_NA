/* @flow */
import type { Player } from 'gstech-core/modules/types/player';
import type { PlayerWithBalance } from 'gstech-core/modules/clients/backend-wallet-api';

export type Jurisdiction = 'MGA' | 'GNRS';

const getJurisdiction = (player: Player | PlayerWithBalance): Jurisdiction => {
  if(player.countryId === 'DE') {
    return 'GNRS';
  }
  return 'MGA';
}

module.exports = { getJurisdiction };