/* @flow */
import type { PlayerIdentifier } from './types/player';

const getExternalPlayerId = (playerIdentifier: { brandId: BrandId, id: Id, ... }): string =>
  `${playerIdentifier.brandId}_${playerIdentifier.id}`;

const getPlayerId = (externalPlayerId: string): PlayerIdentifier => {
  const tokens = (externalPlayerId || '').split('_');
  if (tokens.length !== 2 || isNaN(tokens[1])) {
    throw new Error(`Invalid externalPlayerId format: '${externalPlayerId}'`);
  }

  const [brandId, playerId] = tokens;
  return { brandId: ((brandId): any), id: Number(playerId) };
};

const getPlayerIdByUsername = (username: string): { brandId: BrandId, playerId: Id } => {
  const [brandId,, playerId]: any[] = username.split('_');

  return { brandId, playerId };
};

const returnGameScript = (
  url: string,
  scripts: { realityCheckScript?: string } = {},
): { html?: string, parameters?: mixed, url?: string } => {
  const result = {
    html: `
<iframe id='gameScriptFrame' allowfullscreen="true" allow="autoplay" frameborder="0" allowtransparency="true" seamless="seamless" src="${url}"></iframe>
<script>
    ${
      scripts.realityCheckScript
        ? `window.brandserver && window.brandserver.addRealityCheckListener(function() { ${scripts.realityCheckScript} });`
        : ''
    }
</script>`,
    url,
  };
  return result;
};

module.exports = {
  getExternalPlayerId,
  getPlayerId,
  getPlayerIdByUsername,
  returnGameScript,
};
