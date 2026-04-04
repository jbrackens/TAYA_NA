/* @flow */
const moment = require('moment-timezone');
const request = require('supertest');
const keys = require('lodash/fp/keys');
const pg = require('gstech-core/modules/pg');
const app = require('../../index');

const { players: { john } } = require('../../../scripts/utils/db-data');
const Player = require('./Player');
const Person = require('../persons/Person');
const Authenticate = require('./Authenticate');
const Limit = require('../limits');
const { search } = require('./query');
const PlayerEvent = require('./PlayerEvent');
const Fraud = require('../frauds/Fraud');

describe('Players', () => {

  describe('partial player set password flow', () => {
    let playerId;

    it('creates partial player', async () => {
      const player = await Player.createPartial({
        brandId: 'LD',
        languageId: 'en',
        currencyId: 'EUR',
        ipAddress: '1.2.3.4',
        email: 'some@email.com',
      });
      playerId = player.id;
    });

    it('prevent set password equal to email', async () => {
      try {
        const res = await Authenticate.setPassword(playerId,'some@email.com');
        expect(res).to.equal(false);
      } catch (e) {
        expect(e.error.code).to.equal(469); // errorCodes.PASSWORD_CANNOT_EQUAL_EMAIL
      }
    });

    it('set password to new partial player', async () => {
      const res = await Authenticate.setPassword(playerId,"someStrongPassword");
      expect(res).to.equal(true);
    });

    it('prevent set password again', async () => {
      try {
        const res = await Authenticate.setPassword(playerId,"someStrongPassword");
        expect(res).to.equal(false);
      } catch (e) {
        expect(e.error.code).to.equal(474); // errorCodes.PASSWORD_ALREADY_SET
      }
    });

  });

  describe('partial player', () => {
    let playerId;

    it('creates partial player', async () => {
      const player = await Player.createPartial({
        brandId: 'LD',
        languageId: 'en',
        currencyId: 'EUR',
        ipAddress: '1.2.3.4',
      });
      playerId = player.id;
    });

    it('updates some player fields', async () => {
      await Player.updatePartial(playerId, {
        firstName: 'Edward',
        lastName: 'Strange',
        address: 'Foo gate 1',
        city: 'Partial',
        postCode: '123123',
        dateOfBirth: '1956-12-11',
        countryId: 'NO',
      });
    });

    it('completes partial player creation', async () => {
      await Player.completePartial(playerId, {
        mobilePhone: '3512312312312321',
        password: '12312312312312',
        email: `fooo@${Date.now()}.com`,
      });
    });

    it('is no longer partial nor closed', async () => {
      const player = await Player.getPlayerWithDetails(playerId);
      expect(player).to.containSubset({
        accountClosed: false,
      });
    });
  });

  describe('when created succesfully', () => {
    let playerId;
    let username;
    let event;
    let handle;

    beforeEach(async () => {
      await clean.players();
      const player = await Player.create({ ...john, activated: false, brandId: 'LD', allowSMSPromotions: true, allowEmailPromotions: true });
      playerId = player.id;
      username = player.username;
    });

    it('can find player by username', async () => {
      const player = await Player.findByUsername('LD', username);
      expect(player.id).to.equal(playerId);
    });

    describe('uniqueness by name and date of birth', () => {
      it('can find a player with same name and date of birth', async () => {
        const p = await Player.findPlayerByNameDOB('LD', {
          ...john,
          firstName: `${john.firstName}`,
          lastName: `${john.lastName}`,
          dateOfBirth: john.dateOfBirth,
        });
        expect(p.firstName).to.equal(john.firstName);
      });

      it("doesn't find a player with same name and date of birth in other brand", async () => {
        const p = await Player.findPlayerByNameDOB('CJ', {
          ...john,
          firstName: `${john.firstName}`,
          lastName: `${john.lastName}`,
          dateOfBirth: john.dateOfBirth,
        });
        expect(p).to.equal(undefined);
      });

      it("can find a player with same name and date of birth and it's case insensitive", async () => {
        const p = await Player.findPlayerByNameDOB('LD', {
          ...john,
          firstName: `${john.firstName}`.toUpperCase(),
          lastName: `${john.lastName}`.toUpperCase(),
          dateOfBirth: john.dateOfBirth,
        });
        expect(p.firstName).to.equal(john.firstName);
      });

      it('can find a player with same name and date of birth, no matter where the middle names are', async () => {
        const firstName = 'John Doe';
        await Player.create({
          ...john,
          brandId: 'LD',
          firstName,
          lastName: 'Smith',
          email: 'john.doe.smith@gmail.com',
          mobilePhone: '4903933333231',
        });
        const p = await Player.findPlayerByNameDOB('LD', {
          ...john,
          firstName: 'JOHN',
          lastName: 'DOE SMITH',
          dateOfBirth: john.dateOfBirth,
        });
        expect(p.firstName).to.equal(firstName);
      });
    });

    describe('uniqueness by name and post code', () => {
      it('can find a player with same name and post code', async () => {
        const p = await Player.findPlayerByNamePostCode('LD', {
          ...john,
          firstName: `${john.firstName}`,
          lastName: `${john.lastName}`,
          postCode: john.postCode,
        });
        expect(p.firstName).to.equal(john.firstName);
      });

      it("doesn't find a player with same name and post code in other brand", async () => {
        const p = await Player.findPlayerByNamePostCode('CJ', {
          ...john,
          firstName: `${john.firstName}`,
          lastName: `${john.lastName}`,
          postCode: john.postCode,
        });
        expect(p).to.equal(undefined);
      });

      it("can find a player with same name and post code and it's case insensitive", async () => {
        const p = await Player.findPlayerByNamePostCode('LD', {
          ...john,
          firstName: `${john.firstName}`.toUpperCase(),
          lastName: `${john.lastName}`.toUpperCase(),
          postCode: john.postCode,
        });
        expect(p.firstName).to.equal(john.firstName);
      });

      it('can find a player with same name and post code, no matter where the middle names are', async () => {
        const firstName = 'John Doe';
        await Player.create({
          ...john,
          brandId: 'LD',
          firstName,
          lastName: 'Smith',
          email: 'john.doe.smith@gmail.com',
          mobilePhone: '4903933333231',
        });
        const p = await Player.findPlayerByNamePostCode('LD', {
          ...john,
          firstName: 'JOHN',
          lastName: 'DOE SMITH',
          postCode: john.postCode,
        });
        expect(p.firstName).to.equal(firstName);
      });
    });

    describe('uniqueness by name and address', () => {
      it('can find a player with same name and address', async () => {
        const p = await Player.findPlayerByNameAddress('LD', {
          ...john,
          firstName: `${john.firstName}`,
          lastName: `${john.lastName}`,
          address: john.address,
        });
        expect(p.firstName).to.equal(john.firstName);
      });

      it("doesn't find a player with same name and address in other brand", async () => {
        const p = await Player.findPlayerByNameAddress('CJ', {
          ...john,
          firstName: `${john.firstName}`,
          lastName: `${john.lastName}`,
          address: john.address,
        });
        expect(p).to.equal(undefined);
      });

      it("can find a player with same name and address and it's case insensitive", async () => {
        const p = await Player.findPlayerByNameAddress('LD', {
          ...john,
          firstName: `${john.firstName}`.toUpperCase(),
          lastName: `${john.lastName}`.toUpperCase(),
          address: john.address,
        });
        expect(p.firstName).to.equal(john.firstName);
      });

      it('can find a player with same name and address, no matter where the middle names are', async () => {
        const firstName = 'John Doe';
        await Player.create({
          ...john,
          brandId: 'LD',
          firstName,
          lastName: 'Smith',
          email: 'john.doe.smith@gmail.com',
          mobilePhone: '4903933333231',
        });
        const p = await Player.findPlayerByNameAddress('LD', {
          ...john,
          firstName: 'JOHN',
          lastName: 'DOE SMITH',
          address: john.address,
        });
        expect(p.firstName).to.equal(firstName);
      });
    });

    it('can find a player with query', async () => {
      const p = await Player.findPlayer('LD', { email: john.email });
      expect(p.firstName).to.equal(john.firstName);
    });

    it('player find fails when querying other brand', async () => {
      const p = await Player.findPlayer('CJ', { email: john.email });
      expect(p).to.equal(undefined);
    });

    it('can authenticate player with password', async () => {
      const player = await Authenticate.authenticate('LD', john.email, john.password, john.ipAddress);
      expect(player.id).to.equal(playerId);
    });

    it('can authenticate player with a legacy password', async () => {
      await pg('players').update({ hash: '5A0A9E9C740670DEB09B37476EF696C74A0B4A142697334F44E7F4957B4F17F2:772774A5A6' }).where({ id: playerId });
      const player = await Authenticate.authenticate('LD', john.email, 'foobar123', john.ipAddress);
      expect(player.id).to.equal(playerId);
    });

    it('can authenticate player with uppercase email', async () => {
      const player = await Authenticate.authenticate('LD', john.email.toUpperCase(), john.password, john.ipAddress);
      expect(player.id).to.equal(playerId);
    });


    it('can activate player', async () => {
      const player = await Player.get(playerId);
      expect(player.activated).to.equal(false);
      await pg.transaction(tx => Player.activate(playerId, '1.2.3.4', tx));
      const activatedPlayer = await Player.get(playerId);
      expect(activatedPlayer.activated).to.equal(true);
    });

    it('can update player data', async () => {
      const update: any = { firstName: 'Jonathan' };
      const result = await Player.update(playerId, update, 1);
      expect(result).to.containSubset({
        brandId: 'LD',
        email: 'john.doe@hotmail.com',
        firstName: 'Jonathan',
        lastName: 'Doe',
        address: 'Knesebeckstraße 98',
        postCode: '48317',
        city: 'Drensteinfurt',
        countryId: 'DE',
        dateOfBirth: '1985-12-14',
        languageId: 'de',
        currencyId: 'EUR',
        allowEmailPromotions: true,
        allowSMSPromotions: true,
        activated: false,
      });
      const events = await PlayerEvent.queryPlayerEvents(playerId, ['account']);
      expect(events).containSubset([{
        type: 'account',
        key: 'players.firstName',
        title: 'First name changed to Jonathan (John)',
        handle: 'Test',
      }]);
    });

    it('returns an error with invalid password', async () => {
      try {
        await Authenticate.authenticate('LD', john.email, 'xxx', john.ipAddress);
        expect(true).to.equal(false);
        // eslint-disable-next-line
      } catch (e) {}
    });

    it('blocks login after five invalid login tries', async () => {
      try {
        await Authenticate.authenticate('LD', john.email, 'xxx', john.ipAddress);
      // eslint-disable-next-line no-empty
      } catch (e) {}
      try {
        await Authenticate.authenticate('LD', john.email, 'xxx', john.ipAddress);
      // eslint-disable-next-line no-empty
      } catch (e) {}
      try {
        await Authenticate.authenticate('LD', john.email, 'xxx', john.ipAddress);
      // eslint-disable-next-line no-empty
      } catch (e) {}
      try {
        await Authenticate.authenticate('LD', john.email, 'xxx', john.ipAddress);
      } catch (e) {
        expect(e.error.code).to.equal(521);
      }
      try {
        await Authenticate.authenticate('LD', john.email, 'xxx', john.ipAddress);
      } catch (e) {
        expect(e.error.code).to.equal(521);
      }
      try {
        await Authenticate.authenticate('LD', john.email, john.password, john.ipAddress);
        expect(true).to.equal(false);
      } catch (e) {
        expect(e.error.code).to.equal(513);
      }
      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.containSubset([
        {
          fraudKey: 'login_blocked',
        },
      ]);
    });

    it('can search a player with fuzzy matching', async () => {
      const players = await search(1, 'all', { brandId: undefined, text: 'jonn doo' });
      expect(players).to.containSubset([
        { firstName: 'John', lastName: 'Doe' },
      ]);
    });

    it('can search a player with exact matching', async () => {
      const players = await search(1, 'all', { brandId: undefined, text: '"jonn doo"' });
      expect(players.length).to.equal(0);
      const players2 = await search(1, 'all', { brandId: undefined, text: '"John Doe"' });
      expect(players2).to.containSubset([
        { firstName: 'John', lastName: 'Doe' },
      ]);
    });

    it('can search for online players', async () => {
      const players2 = await search(1, 'online', { brandId: undefined, text: '' });
      expect(players2.length).to.equal(0);
    });

    it('can search for tasks', async () => {
      const players2 = await search(1, 'tasks', { brandId: undefined, text: '' });
      expect(players2.length).to.equal(0);
    });

    it('can search for tasks of given type', async () => {
      const players2 = await search(1, 'tasks', { brandId: undefined, text: '', type: 'geo' });
      expect(players2.length).to.equal(0);
    });

    it('can search for players with withdrawals', async () => {
      const players2 = await search(1, 'withdrawals', { brandId: undefined, text: '' });
      expect(players2.length).to.equal(0);
    });

    it('can search for players with email', async () => {
      const players2 = await search(1, 'all', { brandId: undefined, text: john.email });
      expect(players2.length).to.equal(1);
    });

    it('can fetch sidebar status', async () => {
      const status = await Player.getSidebarStatus();
      expect(status).to.containSubset([{
        brandId: 'LD',
        tasks: [],
        docs: 0,
        withdrawals: 0,
        online: 0,
        frauds: 0
      }]);
    });

    it('can search with pending deposits', async () => {
      let headers = {};
      let transactionKey = '';
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          headers = { Authorization: `Token ${res.body.token}` };
        });

      await request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 5000, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });

      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ amount: 4500, account: 'XX123213', externalTransactionId: '243254345543534534', status: 'pending', rawTransaction: { id: 123, xxx: 'yyy' } })
        .expect(200);

      const [player] = await search(1, 'all', { brandId: 'LD', text: john.email });
      expect(player).to.deep.equal({
        accountClosed: false,
        accountSuspended: false,
        brandId: 'LD',
        currencyId: 'EUR',
        email: 'john.doe@hotmail.com',
        firstName: 'John',
        fraudIds: [],
        gamblingProblem: false,
        id: player.id,
        kycDocumentIds: [],
        lastName: 'Doe',
        online: true,
        pendingDeposits: true,
        totalAmount: 0,
        username: player.username,
        withdrawals: [],
      });
    });

    it('can tag player, search with tag, and remove tag', async () => {
      const tags0 = await Player.getTags(playerId);
      expect(keys<string>(tags0)).to.deep.equal([]);
      await Player.addTag(playerId, 'highroller');
      await Player.addTag(playerId, 'foobar');
      const players = await search(1, 'all', { brandId: undefined, text: '#highroller' });
      const tags = await Player.getTags(playerId);
      expect(keys<string>(tags)).to.deep.equal(['foobar', 'highroller']);
      expect(players.length).to.equal(1);
      await Player.removeTag(playerId, 'highroller');
      const players2 = await search(1, 'all', { brandId: undefined, text: '#highroller' });
      expect(players2.length).to.equal(0);
    });

    it('is unable to log in when login is blocked', async () => {
      await Player.updateAccountStatus(playerId, { loginBlocked: true }, 1);
      try {
        await Authenticate.authenticate('LD', john.email, john.password, john.ipAddress);
        expect(true).to.equal(false);
      } catch (e) {
        expect(e.error.code).to.equal(513);
      }
    });

    it('returns player with preprocessed details', async () => {
      const player = await Player.getPlayerWithDetails(playerId);
      expect(player).to.containSubset({
        brandId: 'LD',
        email: 'john.doe@hotmail.com',
        firstName: 'John',
        lastName: 'Doe',
        address: 'Knesebeckstraße 98',
        postCode: '48317',
        city: 'Drensteinfurt',
        mobilePhone: '4903944433231',
        countryId: 'DE',
        dateOfBirth: '1985-12-14',
        languageId: 'de',
        currencyId: 'EUR',
        allowEmailPromotions: true,
        allowSMSPromotions: true,
        activated: false,
        verified: false,
        selfExclusionEnd: null,
        allowGameplay: true,
        allowTransactions: true,
        loginBlocked: false,
        accountClosed: false,
        accountSuspended: false,
        numDeposits: 0,
        preventLimitCancel: false
      });
    });

    it('fetches risk flags', async () => {
      const { potentialGamblingProblem } = await Player.getRiskFlags(playerId);
      expect(potentialGamblingProblem).to.equal(false);
    });

    it('disables promotions when self exclusion is set', async () => {
      await Limit.create({ playerId, permanent: true, reason: 'Test', type: 'exclusion', userId: null, limitValue: null, expires: null });
      const player = await Player.getPlayerWithDetails(playerId);
      expect(player).to.containSubset({
        allowEmailPromotions: false,
        allowSMSPromotions: false,
      });
      expect(player.selfExclusionEnd).to.not.equal(null);
    });

    it('disables promotions when account is suspended', async () => {
      await Player.suspendAccount(playerId, false, ['fake'], 'Similar details to xxxx', 1);
      const player = await Player.getPlayerWithDetails(playerId);
      expect(player).to.containSubset({
        allowEmailPromotions: false,
        allowSMSPromotions: false,
      });
    });

    it('logs an event when account is suspended', async () => {
      await Player.suspendAccount(playerId, false, ['fake'], 'Similar details to xxxx', 1);
      const player = await Player.getPlayerWithDetails(playerId);
      const log = await PlayerEvent.queryPlayerEvents(player.id);
      expect(log).to.containSubset([
        {
          type: 'note',
          content: 'Similar details to xxxx',
        },
        {
          type: 'account',
          title: 'Player account closed (reason: Fake details)',
        },
      ]);
    });

    it('can get undefined if no sticky note for player', async () => {
      const noNote = await Player.getStickyNote(playerId);
      expect(noNote).to.equal(undefined);
    });

    it('can set and get a sticky note for player', async () => {
      const [note] = await PlayerEvent.addNote(playerId, 1, 'Disabled game play until KYC documents are received (sticky)');
      await Player.setStickyNote(playerId, note.id);

      const stickyNote = await Player.getStickyNote(playerId);
      expect(stickyNote).to.deep.equal('Disabled game play until KYC documents are received (sticky)');
    });

    it('updates player updatedAt field when changing data', async () => {
      const update: any = { firstName: 'Joseph' };
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 100));
      await Player.update(playerId, update, 1);
      const { createdAt, updatedAt } = await pg('players').first('*').where({ id: playerId });
      expect(createdAt < updatedAt).to.equal(true);
    });

    it('can update player status pep and creates event even if the value was the same', async () => {
      const user = await pg('users').first();
      handle = user.handle;
      const result = await Player.updateAccountStatus(playerId, { pep: false }, user.id);

      expect(result).to.deep.equal([true]);
      const events = await pg('player_events').where({ playerId, key: 'pep.false' });
      expect(events.length).to.equal(1);
      [event] = events;
    });

    it('can get player status', async () => {
      await pg('player_events').insert({ ...event, playerId });

      const result = await Player.getAccountStatus(playerId);

      expect(result).to.deep.equal({
        activated: false,
        allowGameplay: true,
        allowTransactions: true,
        verified: false,
        loginBlocked: false,
        accountClosed: false,
        accountSuspended: false,
        gamblingProblem: false,
        riskProfile: 'low',
        depositLimitReached: null,
        documentsRequested: false,
        preventLimitCancel: false,
        pep: false,
        modified: {
          pep: {
            timestamp: result.modified.pep.timestamp,
            name: handle,
          },
          riskProfile: {
            timestamp: null,
            name: null,
          },
          verified: {
            timestamp: null,
            name: null,
          }
        }
      });

      expect(moment(result.modified.pep.timestamp).toString()).to.equal(moment(event.createdAt).toString());
    });

    it('toggles player limit-cancellation flag', async () => {
      const user = await pg('users').first();
      const { preventLimitCancel: initialValue } = await Player.getAccountStatus(playerId);
      const result = await Player.updateAccountStatus(
        playerId,
        { preventLimitCancel:!initialValue },
        user.id,
      );
      expect(result).to.deep.equal([true]);
      const { preventLimitCancel: newValue } = await Player.getAccountStatus(playerId);
      expect(newValue).not.to.equal(initialValue);
    })

    describe('cross brand tags', () => {
      let secondPlayerId;

      beforeEach(async () => {
        secondPlayerId = await Player.create({ brandId: 'CJ', ...john }).then(({ id }) => id);
      });

      it('applies and removes cross-brand tags on all linked accounts', async () => {
        await Person.connectPlayersWithPerson(pg, playerId, secondPlayerId);
        const tags0 = await Player.getTags(playerId);
        expect(keys<string>(tags0)).to.deep.equal([]);

        await Player.addTag(playerId, 'pass-sow');
        const players = await search(1, 'all', { brandId: undefined, text: '#pass-sow' });
        expect(players.length).to.equal(2);
        expect(players).to.containSubset([{ id: playerId }, { id: secondPlayerId }]);
        await Player.removeTag(secondPlayerId, 'pass-sow');
        const players2 = await search(1, 'all', { brandId: undefined, text: '#pass-sow' });
        expect(players2.length).to.equal(0);
      });

      it('does not apply normal tags to all linked accounts', async () => {
        await Person.connectPlayersWithPerson(pg, playerId, secondPlayerId);
        const tags0 = await Player.getTags(playerId);
        expect(keys<string>(tags0)).to.deep.equal([]);

        await Player.addTag(playerId, 'highroller');
        const players = await search(1, 'all', { brandId: undefined, text: '#highroller' });
        expect(players.length).to.equal(1);
      });
    });
  });
});
