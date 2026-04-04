/* @flow */
const { v1: uuid } = require('uuid');
const { createSession } = require('../sessions');
const { createManufacturerSession } = require('../sessions');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');

const Ticket = require('./Ticket');

describe('Tickets', () => {
  let playerId;
  const mSessionId = uuid();
  const ticketId = new Date().getTime().toString();

  before(async () => {
    const { john } = await setup.players();
    playerId = john.id;
    const session = await createSession(john, '1.2.3.4');
    await createManufacturerSession('NE', mSessionId, session.id, 'desktop', {});
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(20000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
  });

  const ticket = {
    "stake":{
      "amount":92.5,
      "tax":7.5,
      "totalAmount":100
    },
    "wonAmount":{
      "amount":94.4,
      "tax":23.6,
      "totalAmount":118
    },
    "date":"2022-07-25T10:04:02Z",
    "status":"won",
    "bets":[
         {
          "id":"558n9395-udb0-7345-6fb3-a1u42jc25941",
          "stake":{
            "amount":92.5,
            "tax":7.5,
            "totalAmount":100
          },
          "selections":[
            {
              "id":"b7B7G29tZS9vZDptYXRjaDo5Nzpl33BxfHZhcmlhbnQ9d3G72nR3by8xLXZhtulbzlQ9d2F5OnR3b3x3YXk9dHdfPsR=",
              "outcome":{
                "name":"home",
                 "id":1,
                 "marketId":"1-variant=way:two|way=two",
                  "marketName":"Winner"
                },
                "odds":1.28,
                  "event":{
                    "id":"od:match:97915",
                    "teams":[
                      {
                        "name":"Serral",
                        "isHome":true,
                        "id":"od:competitor:461"
                      }, {
                        "name":"Solar",
                        "isHome":false,
                        "id":"od:competitor:336"
                      }
                    ],
                  "tournamentId":"od:tournament:2411",
                  "tournamentName":"TeamLiquid StarLeague 9",
                  "sportName":"Starcraft 2",
                  "sportId":"od:sport:11",
                  "dateStart":"2022-07-29T11:45:00Z"
                  },
                  "won":true,
                  "voided":false
            } ],
         "won":true,
         "voided":false,
         "wonAmount":{
            "amount":94.4,
            "tax":23.6,
            "totalAmount":118
         },
         "totalOdds":1.28,
         "systems":[1] }
   ],
   "possibleWinAmount":{
      "amount":94.4,
      "tax":23.6,
      "totalAmount":118
    }
  };

  it('create a ticket for a game round id', async () => {
    await Ticket.upsertTicket(
      ticketId,
      { content: ticket }
    );
  });

  it('can get ticket for a game round id', async () => {
    const ticketForRound = await Ticket.getTicket(ticketId);

    expect(ticketForRound.content).to.deep.equal(ticket);
  });
});
