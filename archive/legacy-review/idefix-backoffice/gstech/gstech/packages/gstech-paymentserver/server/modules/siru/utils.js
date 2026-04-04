/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';

const crypto = require('crypto');

const calculateSignature = (
  data: Object,
  cConf: { secret: string, ... },
  signatureFields: string[],
): string => {
  const r = [];
  for (const field of Array.from(signatureFields)) {
    if (data[field] != null) {
      r.push(data[field]);
    }
  }
  return crypto.createHmac('sha512', cConf.secret).update(r.join(';'), 'utf8').digest('hex');
};

const languageToLocale = (player: PlayerWithDetails): string => {
  if (player.languageId === 'FI') { return 'fi_FI'; }
  if (player.languageId === 'SV') { return 'sv_SE'; }
  if (player.languageId === 'NO') { return 'nn_NO'; }
  if (player.countryId === 'FI') { return 'fi_FI'; }
  if (player.countryId === 'SE') { return 'sv_SE'; }
  if (player.countryId === 'NO') { return 'nn_NO'; }
  return 'en_GB';
};

module.exports = { calculateSignature, languageToLocale };
