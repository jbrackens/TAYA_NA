/* @flow */
const moment = require('moment-timezone');

const hourStart = (hour: Date): any => {
  const begin = moment(hour).startOf('hour');
  if (moment(begin).subtract(1, 'hour').utcOffset() !== moment(begin).subtract(1, 'hour').subtract(1, 'second').utcOffset()) {
    begin.subtract(1, 'hour');
  }
  return begin.format('YYYY-MM-DDTHH:mm:ss.000000Z');
}

const hourEnd = (hour: Date): any => {
  const begin = moment(hour).startOf('hour');
  return begin.add(1, 'hour').subtract(1, 'second').endOf('hour').format('YYYY-MM-DDTHH:mm:ss.999999Z');
};

module.exports = { hourStart, hourEnd };
