/* @flow */

const _ = require('lodash');
const promiseLimit = require('promise-limit');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const {
  addTag,
  removeTag,
  getPlayersWithTag,
  setStickyNote,
  getStickyNote,
} = require('../server/modules/players/Player');
const { addNote } = require('../server/modules/players/PlayerEvent');
const newTagsGrouped = require('./assets/413-player-tag-groups.json');

const limit = promiseLimit(2);

(async () => {
  const ops = [];
  for (const [newTagName, prevTags] of _.entries(newTagsGrouped)) {
    logger.info('Processing New Tag', newTagName);
    for (const pT of prevTags) {
      const { tag, count } = pT;
      const ps = await getPlayersWithTag(tag);
      logger.info(`Found ${ps.length} (expected ${count}) cases of '${tag}'`);
      for (const p of ps) {
        const { id, tags } = p;
        ops.push(
          async (
            nt: string = newTagName,
            ot: string = tag,
            i: number = id,
            t: { [string]: string } = tags,
          ): any => {
            logger.info(`[${i}] '${ot}' -> '${nt}'`);
            try {
              return await pg.transaction(async (tx) => {
                if (nt !== 'notarize') {
                  await addTag(i, nt, t[ot], tx);
                  await removeTag(i, ot, tx);
                }
                if (nt === 'notarize') {
                  const stickyNote = await getStickyNote(i, tx);
                  const newContent = _.compact<string>([
                    stickyNote,
                    `"[${t[ot]}] ${ot}" (converted obscure tag to note)`,
                  ]).join('\n');
                  const [note] = await addNote(i, null, newContent, tx);
                  await setStickyNote(i, note.id, tx);
                  await removeTag(i, ot, tx);
                }
                logger.info(`[${i}] '${ot}' -> '${nt}' - DONE`);
              });
            } catch (err) {
              logger.error(`[${i}] '${ot}' -> '${nt}' - ERROR`, err);
              return false;
            }
          },
        );
      }
    }
  }
  await Promise.all(ops.map((op) => limit(() => op())));
  process.exit();
})();
