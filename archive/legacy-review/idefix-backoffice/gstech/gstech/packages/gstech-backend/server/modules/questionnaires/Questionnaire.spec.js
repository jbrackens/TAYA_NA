/* @flow */
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { players: { john } } = require('../../../scripts/utils/db-data');
const { getUnansweredQuestionnaires, answerQuestionnaire, getQuestionnaires, getRequiredQuestionnaires, getQuestionnaireValidator } = require('./Questionnaire');
const Player = require('../players/Player');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');

describe('Questionnaire', () => {
  describe('Player without deposits', () => {
    let playerId;

    before(async () => {
      await clean.players();
      await setup.setFixedConversionRates();
      const player = await Player.create({ brandId: 'LD', ...john });
      playerId = player.id;
    });

    it('can answer questionnaire even if not required', async () => {
      await answerQuestionnaire(playerId, 'PEP', [
        { key: 'pep', value: 'false' },
      ]);
    });

    it('returns questionnaires', async () => {
      const answers = await getQuestionnaires(playerId);
      expect(answers).to.containSubset([
        {
          name: 'PEP',
          description: 'AML: Politically Exposed Person',
          answers: [
            {
              key: 'pep',
              question: 'Politically exposed person',
              answer: 'false',
            },
          ],
        },
        {
          name: 'SOW',
          description: 'AML: Source of Wealth',
          answeredAt: null,
          answers: [
            {
              key: 'source_of_wealth',
              question: 'Source of Wealth',
              answer: null,
            },
            {
              key: 'explanation',
              question: 'Additional explanation',
              answer: null,
            },
          ],
        },
      ]);
    });
  });

  describe('Player with deposits', () => {
    let playerId;

    before(async () => {
      await clean.players();
      await setup.setFixedConversionRates();
      const player = await Player.create({ brandId: 'LD', ...john });
      playerId = player.id;
    });

    beforeEach(async () => {
      await pg('player_questionnaires').where({ playerId }).del();
    });

    it('returns joi definition of questionnaire', async () => {
      const schema = await getQuestionnaireValidator(playerId, 'PEP');
      const answers = await validate({ pep: 'true' }, schema, 'Questionnaire answer validation failed');
      expect(answers).to.deep.equal({ pep: 'true' });
    });

    it('does not require due diligence', async () => {
      const { flagged, locked } = await Player.getRequireDueDiligenceFlags(playerId);
      expect(flagged).to.equal(false);
      expect(locked).to.equal(false);
    });

    it('no mandatory questionnaires when deposits under 2k', async () => {
      const questionnaires = await getRequiredQuestionnaires(playerId);
      expect(questionnaires).to.deep.equal(['Transfer']);
    });

    it('requires Lifetime_Deposit_2k questionnaire when deposits over 2k', async () => {
      const { transactionKey } = await startDeposit(playerId, 1, 2000_00, null);
      await processDeposit(2000_00, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
      const questionnaires = await getRequiredQuestionnaires(playerId);
      expect(questionnaires).to.deep.equal(['PEP', 'SOW', 'Lifetime_Deposit_2k', 'Transfer']);
    });

    it('requires PEP and Total_Deposits_5k questionnaires when deposits over 5k', async () => {
      const { transactionKey } = await startDeposit(playerId, 1, 5500_00, null);
      await processDeposit(5500_00, transactionKey, 'FI2112345600008739', null, 'external-id2', 'complete');
      const questionnaires = await getRequiredQuestionnaires(playerId);
      expect(questionnaires).to.have.members(['PEP', 'SOW', 'Lifetime_Deposit_2k', 'Transfer', 'Total_Deposits_5k']);
    });

    it('requires Total_Deposits_10k questionnaire even if Total_Deposits_5k is not filled', async () => {
      const { transactionKey } = await startDeposit(playerId, 1, 5_000_00, null);
      await processDeposit(5_000_00, transactionKey, 'FI2112345600008739', null, 'external-id3', 'complete');
      const questionnaires = await getRequiredQuestionnaires(playerId);
      expect(questionnaires).to.have.members(['PEP', 'SOW', 'Lifetime_Deposit_2k', 'Transfer', 'Total_Deposits_10k']);
    });

    it('returns questionnaires', async () => {
      const answers = await getQuestionnaires(playerId);
      expect(answers).to.containSubset([
        {
          name: 'PEP',
          description: 'AML: Politically Exposed Person',
          answeredAt: null,
          answers: [
            {
              key: 'pep',
              question: 'Politically exposed person',
              answer: null,
            },
          ],
        },
        {
          name: 'SOW',
          description: 'AML: Source of Wealth',
          answeredAt: null,
          answers: [
            {
              key: 'source_of_wealth',
              question: 'Source of Wealth',
              answer: null,
            },
            {
              key: 'explanation',
              question: 'Additional explanation',
              answer: null,
            },
          ],
        },
      ]);
    });

    it('can fetch list of unanswered questionnaires for players', async () => {
      const questionnaires = await getUnansweredQuestionnaires(playerId);
      logger.debug('can fetch list of unanswered questionnaires for players', questionnaires);
      const expectedQuestionnaires = [
        {
          description: 'AML: Politically Exposed Person',
          name: 'PEP',
          questions: [
            {
              key: 'pep',
              question: 'Politically exposed person',
              required: true,
            },
          ],
        },
        {
          description: 'AML: Source of Wealth',
          name: 'SOW',
          questions: [
            {
              key: 'explanation',
              question: 'Additional explanation',
              required: false,
            },
            {
              key: 'source_of_wealth',
              question: 'Source of Wealth',
              required: true,
            },
          ],
        },
        {
          description: 'MGA: Transfer to Esports license',
          name: 'Transfer',
          questions: [
            {
              key: 'license_transfer',
              question: 'Accept transfer',
              required: true,
            },
          ],
        },
        {
          description: 'Deposit amount satisfaction',
          name: 'Total_Deposits_5k',
          questions: [
            {
              key: 'ltd',
              question: 'Satisfied with deposit amount',
              required: true,
            },
          ],
        },
        {
          description: 'Deposit amount satisfaction',
          name: 'Total_Deposits_10k',
          questions: [
            {
              key: 'ltd',
              question: 'Satisfied with deposit amount',
              required: true,
            },
          ],
        },
        {
          description: 'Deposit amount satisfaction',
          name: 'Total_Deposits_15k',
          questions: [
            {
              key: 'ltd',
              question: 'Satisfied with deposit amount',
              required: true,
            },
          ],
        },
        {
          description: 'AML: Source Of Wealth (75k+ Lifetime Deposits)',
          name: 'Lifetime_Deposit_75k',
          questions: [
            {
              key: 'explanation',
              question: 'Additional explanation',
              required: false,
            },
            {
              key: 'industry',
              question: 'Industry',
              required: true,
            },
            {
              key: 'salary',
              question: 'Salary',
              required: true,
            },
          ],
        },
        {
          description: 'AML: Source Of Wealth (2k+ Lifetime Deposits)',
          name: 'Lifetime_Deposit_2k',
          questions: [
            {
              key: 'explanation',
              question: 'Additional explanation',
              required: false,
            },
            {
              key: 'industry',
              question: 'Industry',
              required: true,
            },
            {
              key: 'monthlyDeposit',
              question: 'Expected monthly deposit',
              required: true,
            },
            {
              key: 'salary',
              question: 'Salary',
              required: true,
            },
          ],
        },
      ];
      expect(questionnaires).to.containSubset(expectedQuestionnaires);
      expect(questionnaires.length).to.equal(expectedQuestionnaires.length);
    });

    it('fails when trying to save a questionnaire with required answer missing', async () => {
      try {
        await answerQuestionnaire(playerId, 'SOW', [
          { key: 'description', value: 'Salary' },
        ]);
        throw new Error('should have been failed');
      } catch (e) {
        expect(e.message).to.equal('Answer missing for required key \'source_of_wealth\'');
      }
    });

    it('can save answers for a questionnaire', async () => {
      await answerQuestionnaire(playerId, 'PEP', [
        { key: 'pep', value: 'false' },
      ]);
    });

    it('can save updated answers for a questionnaire', async () => {
      await answerQuestionnaire(playerId, 'PEP', [
        { key: 'pep', value: 'false' },
      ]);
      await answerQuestionnaire(playerId, 'PEP', [
        { key: 'pep', value: 'true' },
      ]);
    });

    it('can save answer for Total_Deposits_ questionnaire', async () => {
      await answerQuestionnaire(playerId, 'Total_Deposits_10k', [
        { key: 'ltd', value: 'true' },
      ]);
    });

    it('can save answer for Lifetime_Deposit_2k questionnaire', async () => {
      await answerQuestionnaire(playerId, 'Lifetime_Deposit_2k', [
        { key: 'industry', value: 'audit' },
        { key: 'salary', value: '1-2k' },
        { key: 'monthlyDeposit', value: '5-250' },
      ]);
    });

    it('do not require to fill Total_Deposits_ within a week of answering another questionnaire', async () => {
      await answerQuestionnaire(playerId, 'Total_Deposits_10k', [{ key: 'ltd', value: 'true' }]);
      const { transactionKey } = await startDeposit(playerId, 1, 5000_00, null);
      await processDeposit(5000_00, transactionKey, 'FI2112345600008739', null, 'external-id4', 'complete');
      const questionnaires = await getRequiredQuestionnaires(playerId);
      expect(questionnaires).to.not.include('Total_Deposits_5k');
      expect(questionnaires).to.not.include('Total_Deposits_10k');
      expect(questionnaires).to.not.include('Total_Deposits_15k');
    });

    it('no longer returns unanswered questionnaire', async () => {
      const questionnaires = await getUnansweredQuestionnaires(playerId);
      logger.debug('no longer returns unanswered questionnaire', questionnaires);
      const expectedQuestionnaires = [
        'PEP',
        'SOW',
        'Transfer',
        'Total_Deposits_5k',
        'Total_Deposits_10k',
        'Total_Deposits_15k',
        'Lifetime_Deposit_75k',
        'Lifetime_Deposit_2k',
      ];
      expect(questionnaires.length).to.equal(expectedQuestionnaires.length);
    });

    it('returns current values for answered questions', async () => {
      await answerQuestionnaire(playerId, 'PEP', [{ key: 'pep', value: 'true' }]);

      await answerQuestionnaire(playerId, 'Lifetime_Deposit_2k', [
        { key: 'industry', value: 'consultancy' },
        { key: 'salary', value: '>5k' },
        { key: 'monthlyDeposit', value: '250-500' },
      ]);

      const answers = await getQuestionnaires(playerId);
      expect(answers).to.containSubset([
        {
          name: 'PEP',
          description: 'AML: Politically Exposed Person',
          required: false,
          answers: [{ key: 'pep', question: 'Politically exposed person', answer: 'true' }],
        },
        {
          name: 'Lifetime_Deposit_2k',
          description: 'AML: Source Of Wealth (2k+ Lifetime Deposits)',
          required: false,
          answers: [
            { answer: '250-500', key: 'monthlyDeposit', question: 'Expected monthly deposit' },
            { answer: 'consultancy', key: 'industry', question: 'Industry' },
            { answer: '>5k', key: 'salary', question: 'Salary' },
          ],
        },
      ]);
    });

    it('requires due diligence but is not locked', async () => {
      const { flagged, locked } = await Player.getRequireDueDiligenceFlags(playerId);
      expect(flagged).to.equal(true);
      expect(locked).to.equal(false);
    });
  });
});
