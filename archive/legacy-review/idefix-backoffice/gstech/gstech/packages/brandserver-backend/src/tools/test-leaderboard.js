// @flow
require('flow-remove-types/register')({ ignoreUninitializedFields: true });

const moment = require('moment-timezone');
const logger = require('../server/common/logger');
const leaderboard = require('../server/common/leaderboard');
const ds = require('../server/common/datastorage');

const m = moment().tz('Europe/Rome');

const fetchLeaderboard = async () => [
  { UserName: 'Foo1', Win: 200, Name: 'Foo 11123' },
  { UserName: 'Foo2', Win: 190, Name: 'Foo 10123' },
  { UserName: 'Foo3', Win: 180, Name: 'Foo 9123' },
  { UserName: 'Foo4', Win: 170, Name: 'Foo 8123' },
  { UserName: 'Foo5', Win: 160, Name: 'Foo 7123' },
  { UserName: 'Foo6', Win: 150, Name: 'Foo 6123' },
  { UserName: 'Foo7', Win: 140, Name: 'Foo 5123' },
  { UserName: 'Foo8', Win: 130, Name: 'Foo 4123' },
  { UserName: 'Foo9', Win: 120, Name: 'Foo 3123' },
  { UserName: 'Foo10', Win: 110, Name: 'Foo 2123' },
  { UserName: 'Foo11', Win: 100, Name: 'Foo 1123' },
  { UserName: 'Foo12', Win: 90, Name: 'Foo 923' },
  { UserName: 'Foo13', Win: 80, Name: 'Foo 823' },
  { UserName: 'Foo14', Win: 70, Name: 'Foo 723' },
  { UserName: 'Foo15', Win: 60, Name: 'Foo 623' },
  { UserName: 'Foo16', Win: 50, Name: 'Foo 523' },
  { UserName: 'Foo17', Win: 40, Name: 'Foo 423' },
  { UserName: 'Foo18', Win: 30, Name: 'Foo 323' },
  { UserName: 'Foo19', Win: 20, Name: 'Foo 223' },
  { UserName: 'LD_Asdads.Asd_3000001', Win: 10, Name: 'Asdads Adsasda' },
];

const updateLeaderboard = async () => {
  await ds.init();
  const value = await fetchLeaderboard();
  logger.debug('Update leaderboard', value);
  await leaderboard.update({ generated: m.format('HH:mm'), value });
  process.exit(0);
};

updateLeaderboard();
