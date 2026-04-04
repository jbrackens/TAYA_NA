/* @flow */
import type { RewardProgressUpdateEvent, CreditRewardEvent } from 'gstech-core/modules/types/bus';

const ws = require('ws');
const NRP = require('node-redis-pubsub');
const logger = require('./logger');
const configuration = require('./configuration');
const { updateDetails } = require('./router-helpers');
const { initContext } = require('./utils');
const { session } = require('./session');
const { findPlayer } = require('./modules/legacy-player');
const { newClient } = require('./redis');

let nrp;

declare class WebSocket {
  on(key: string, data: any): void;
  send(data: string): void;
  request: any
}

const noop = () => {};

const heartbeat = function heartbeat(this: any) {
  this.isAlive = true;
};

const eventHandler = async (ws: WebSocket) => {
  // This needs to be done in event listener
  const { createJourney } = require('./journey');
  try {
    logger.debug('event!', ws.request.username);
    const journey = await createJourney(ws.request);
    const details = await updateDetails(journey);
    ws.send(JSON.stringify({ update: { details } }));
  } catch (e) {
    logger.warn('Client failed', e);
  }
};

const handleCreditRewardEvent = async (event: CreditRewardEvent) => {
  try {
    if (nrp) {
      if (event.brandId === configuration.shortBrandId()) {
        await nrp.emit('session', { playerId: event.playerId, event: 'CreditRewardEvent' });
      }
    }
  } catch (e) {
    logger.error('handleCreditRewardEvent failed', e);
  }
};

const handleRewardProgressEvent = async (event: RewardProgressUpdateEvent) => {
  try {
    if (nrp) {
      if (event.brandId === configuration.shortBrandId()) {
        await nrp.emit('session', { playerId: event.playerId, event: 'RewardProgressUpdateEvent' });
      }
    }
  } catch (e) {
    logger.error('handleRewardProgressEvent', e);
  }
};

const initNrp = (): any => {
  const nrpConf = {
    emitter: newClient(),
    receiver: newClient(),
    scope: configuration.project(),
  };
  nrp = new NRP(nrpConf);
  return nrp;
};

const initBroadcast = (wss: any) => {
  initNrp();
  nrp.on('session', (e) => {
    logger.debug('Received event', e);
    wss.clients.forEach((ws) => {
      const cid = String(ws.request.user.details.ClientID);
      logger.debug('match session', cid, cid === String(e.playerId));
      if (cid === String(e.playerId)) {
        eventHandler(ws);
      }
    });
  });
};

const bind = (server: http$Server) => {
  if (!configuration.productionMode()) {
    const wss = new ws.Server({ noServer: true });
    logger.debug('init WebSocket');
    initBroadcast(wss);
    server.on('upgrade', async (request, socket, head) => {
      const response: any = {};
      session(request, response, async () => {
        if (!request.session.username) {
          socket.destroy();
          logger.debug('Destroy socket, no session!');
          return;
        }
        const user = await findPlayer(request.session.username);
        initContext(request, response, user);
        wss.handleUpgrade(request, socket, head, (ws) => {
          const fakeRequest = {
            user,
            session: request.session,
            context: request.context,
          };
          ws.request = fakeRequest;
          wss.emit('connection', ws, request);
        });
      });
    });

    wss.on('connection', (ws) => {
      ws.isAlive = true;
      ws.on('pong', heartbeat);
    });

    setInterval(() => {
      wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(noop);
      });
    }, 5000);
  }
};

module.exports = {
  bind,
  handleRewardProgressEvent,
  handleCreditRewardEvent,
  initNrp,
};
