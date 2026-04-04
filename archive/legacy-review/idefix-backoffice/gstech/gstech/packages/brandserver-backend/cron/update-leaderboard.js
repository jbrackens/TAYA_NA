/* @flow */
process.env.NODE_ENV = process.env.NODE_ENV || 'production'; // production is default
require('../src/server/common/extensions');
const moment = require('moment-timezone');
const _ = require('lodash');
const logger = require('../src/server/common/logger');
const leaderboard = require('../src/server/common/leaderboard');
const ds = require('../src/server/common/datastorage');

const m = moment().tz('Europe/Rome');
const api = require('../src/server/common/api');
const player = require('../src/server/common/modules/legacy-player');

const fetchLeaderboard = async (program: any) => {
  if (program.type === 'playngo') {
    const raw = await api.getLeaderBoard('PNG', program.promotion);
    const result = [];
    for (let i = 0; i < raw.length; i++) {
      const u = raw[i];
      const user = await player.findPlayer(u.UserName);
      if (user != null) {
        result.push({
          UserName: u.UserName,
          Win: u.Win,
          Name: `${user.details.FirstName} ${user.details.LastName.substring(0, 1)}.`,
        });
      } else {
        logger.warn('!!! fetchLeaderboard', 'local player not found', { u });
      }
    }
    return _.orderBy(result, 'Win', 'desc');
  }
  const lb = await api.getPromotion(
    program.promotion,
    program.brands.filter((x) => x !== ''),
  );
  const value = lb.map((row) => ({
    UserName: row.username,
    Win: Number(row.points),
    Name: `${row.firstName} ${row.lastName.substring(0, 1)}.`,
  }));
  return value;
};

const clean = (list: Array<{ Name: string, UserName: any, Win: any }>) =>
  list.filter(
    (row) =>
      row.UserName !== 'KK_Petteri.Voutilainen_2715' &&
      row.UserName !== 'CJ_Petteri.Voutilainen_3182595',
  );

const updateLeaderboard = async () => {
  await ds.init();
  const tournaments = ds.tournaments();
  const date = parseInt(m.format('YYYYMMDD'));
  const program = _.find(tournaments, (t) => t.startDate <= date && t.endDate >= date);
  if (program != null) {
    const value = await fetchLeaderboard(program);
    logger.debug('Update leaderboard', value.length, { program, value });
    await leaderboard.update({ generated: m.format('HH:mm'), value: clean(value) });
  }
  // $FlowFixMe[method-unbinding]
  setTimeout(process.exit, 500);
};

updateLeaderboard();
