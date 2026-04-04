/* @flow */

const throttle = require('lodash/fp/throttle');
const createSocket = require('socket.io');
const NRP = require('node-redis-pubsub');
const logger = require('gstech-core/modules/logger');
const redis = require('../redis');
const Player = require('../../players/Player');

const emitter = redis.create();
const receiver = redis.create();
const nrp = new NRP({
  emitter,
  receiver,
  scope: 'idefix-socket',
});
let io: ?SocketIO$Server = null;

if (process.env.NODE_ENV === 'test') {
  const i: any = {
    emit: (key: string, value: any) => logger.debug('>>> SOCKETIO:emit', { key, value }),
  };
  io = i;
}

nrp.on('broadcast', ({ key, value }) => {
  if (io != null) io.emit(key, value);
});

nrp.on('r/sidebar-status-changed', (sidebarStatus) => {
  if (io != null) io.emit('ws/sidebar-status', sidebarStatus);
});

module.exports = {
  initialize: (server: any) => {
    io = createSocket(server);

    io.on('connection', async (socket) => {
      const sidebarStatus = await Player.getSidebarStatus();
      socket.on('ws/sidebar-status-listening', () => {
        socket.emit('ws/sidebar-status', sidebarStatus);
      });
    });
  },
  emit: (key: string, value: any): any => nrp.emit('broadcast', { key, value }),
  emitSidebarStatusChanged: (throttle<any, Promise<void>>(2 * 60 * 1000, async () => {
    const sidebarStatus = await Player.getSidebarStatus();
    await nrp.emit('r/sidebar-status-changed', sidebarStatus);
  }): any),
};
