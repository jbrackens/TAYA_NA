/* @flow */
const _ = require('lodash');
const find = require('lodash/find');
const intersection = require('lodash/intersection');
const includes = require('lodash/includes');
const pg = require('gstech-core/modules/pg');
const joi = require('gstech-core/modules/joi');
const Player = require('../players');
const Deposit = require('../payments/deposits/Deposit');
const { personPlayerIdsQuery } = require('../persons/Person');

export type Answer = {
  key: string,
  value: string,
};

export type Question = {
  key: string,
  question: string,
};

export type Questionnaire = {
  name: string,
  description: string,
  questions: Question[],
};

const getUnansweredQuestionnaires = async (playerId: Id): Promise<Questionnaire[]> => {
  const { brandId } = await Player.getPlayerById(playerId);
  return await pg('questionnaires')
    .with('person', personPlayerIdsQuery(pg, playerId))
    .select(
      'questionnaires.name',
      'questionnaires.description',
      pg.raw(
        'array_agg(DISTINCT jsonb_build_object(\'key\', "questionnaire_questions"."key", \'question\', "questionnaire_questions"."description", \'required\', "questionnaire_questions"."required")) as "questions"',
      ),
    )
    .innerJoin(
      'questionnaire_questions',
      'questionnaires.id',
      'questionnaire_questions.questionnaireId',
    )
    .where((qb) => {
      qb.where((qb) =>
        qb
          .where('questionnaires.name', '!=', 'Lifetime_Deposit_2k')
          .whereNotIn('questionnaires.id', (qb) =>
            qb.table('player_questionnaires').select('questionnaireId').where({ playerId }),
          ),
      ).orWhere((qb) =>
        qb
          .where('questionnaires.name', '=', 'Lifetime_Deposit_2k')
          .whereNotIn('questionnaires.name', (qb) =>
            qb
              .table('player_questionnaires')
              .select('questionnaires.name')
              .join('questionnaires', 'player_questionnaires.questionnaireId', 'questionnaires.id')
              .whereIn('playerId', pg.select('playerIds').from('person')),
          ),
      );
    })
    .where({ brandId, active: true })
    .groupBy('questionnaires.id');
};

const answerQuestionnaire = async (playerId: Id, name: string, answers: Answer[]) => {
  const { brandId } = await Player.getPlayerById(playerId);
  await pg.transaction(async (tx) => {
    const questions = await tx('questionnaires')
      .innerJoin(
        'questionnaire_questions',
        'questionnaire_questions.questionnaireId',
        'questionnaires.id',
      )
      .select(
        'questionnaires.id',
        'questionnaire_questions.id as questionId',
        'questionnaire_questions.key',
        'questionnaire_questions.required',
      )
      .where({ brandId, name });
    if (questions.length > 0) {
      const [{ id: playerQuestionnaireId }] = await tx('player_questionnaires')
        .insert({
          questionnaireId: questions[0].id,
          playerId,
        })
        .returning('id');
      const ops = questions.map((question) => {
        const answer = find(answers, ({ key }) => key === question.key);
        if (answer != null) {
          return tx('player_questionnaire_answers').insert({
            playerQuestionnaireId,
            questionId: question.questionId,
            answer: answer.value,
          });
        }
        if (question.required) {
          throw Error(`Answer missing for required key '${question.key}'`);
        }
        return null;
      });
      return Promise.all(ops);
    }
    return null;
  });
};

const flaggedQuestionnaires = ['PEP', 'SOW'];
const payAndPlayQuestionnaires = ['PNP_Complete'];
const depositQuestionnaires = [
  'Total_Deposits_5k',
  'Total_Deposits_10k',
  'Total_Deposits_15k',
  'Lifetime_Deposit_75k',
  'Lifetime_Deposit_2k',
];

const getRequiredQuestionnaires = async (playerId: Id): Promise<string[]> => {
  const { flagged } = await Player.getRequireDueDiligenceFlags(playerId);
  const player = await Player.getPlayerWithDetails(playerId);
  const isPartial = player.partial;
  const depositLevel = await Deposit.getDepositLevel(playerId);
  const lifetimeDeposits = await Deposit.getLifetimeDeposits(playerId);
  const questionnaires = await getUnansweredQuestionnaires(playerId);
  const ids = questionnaires.map(({ name }) => name);
  const requiredQuestionnaires = [];
  if (flagged) requiredQuestionnaires.push(...flaggedQuestionnaires);
  if (depositLevel > 0) requiredQuestionnaires.push(`Total_Deposits_${depositLevel}k`);
  if (isPartial) requiredQuestionnaires.push(payAndPlayQuestionnaires[0]);
  const threshold_2k_used_to_be_75k = 2_000_00;
  if (lifetimeDeposits.total >= threshold_2k_used_to_be_75k) requiredQuestionnaires.push('Lifetime_Deposit_2k');
  const rest = ids.filter(
    (id) =>
      ![...flaggedQuestionnaires, ...depositQuestionnaires, ...payAndPlayQuestionnaires].includes(
        id,
      ),
  );
  const result = [...intersection(ids, requiredQuestionnaires), ...rest];
  return result;
};

const getQuestionnaireValidator = async (playerId: Id, name: string): Promise<any> => {
  const { brandId } = await Player.getPlayerById(playerId);
  const rows = await pg('questionnaire_questions')
    .select('key', 'required')
    .innerJoin('questionnaires', 'questionnaire_questions.questionnaireId', 'questionnaires.id')
    .where({ brandId })
    .where('questionnaires.name', name);

  const obj: any = {};
  rows.forEach(({ key, required }) => {
    let d = joi.string().trim();
    if (required) {
      d = d.required();
    } else {
      d = d.allow('');
    }
    obj[key] = d;
  });
  return joi.object(obj).required();
};

 
const getQuestionnaires = async (playerId: Id): Promise<any> => {
  const result = await pg('questionnaires')
    .with('person', personPlayerIdsQuery(pg, playerId))
    .select(
      pg.raw("string_agg(distinct questionnaires.name, '') as name"),
      pg.raw("string_agg(distinct questionnaires.description, '') as description"),
      pg.raw('max(player_questionnaires."answeredAt") as "answeredAt"'),
      pg.raw(
        'array_agg(DISTINCT jsonb_build_object(\'key\', "questionnaire_questions"."key", \'question\', "questionnaire_questions"."description", \'answer\', "player_questionnaire_answers"."answer")) as "answers"',
      ),
    )
    .innerJoin('players', 'players.brandId', 'questionnaires.brandId')
    .innerJoin('questionnaire_questions', {
      'questionnaire_questions.questionnaireId': 'questionnaires.id',
    })
    .leftJoin('player_questionnaires', (qb) =>
      qb
        .on('player_questionnaires.questionnaireId', '=', 'questionnaires.id')
        .on((qb) =>
          qb
            .on((qb) =>
              qb
                .on('player_questionnaires.playerId', '=', pg.raw('?', playerId))
                .on('questionnaires.name', '!=', pg.raw('?', 'Lifetime_Deposit_75k')),
            )
            .orOn((qb) =>
              qb
                .onIn('player_questionnaires.playerId', pg.select('playerIds').from('person'))
                .on('questionnaires.name', '=', pg.raw('?', 'Lifetime_Deposit_75k')),
            ),
        ),
    )
    .leftJoin('player_questionnaire_answers', {
      'player_questionnaire_answers.playerQuestionnaireId': 'player_questionnaires.id',
      'questionnaire_questions.id': 'player_questionnaire_answers.questionId',
    })
    .where('questionnaires.active', true)
    .whereIn('players.id', pg.select('playerIds').from('person'))
    .groupBy('questionnaires.name', 'player_questionnaires.answeredAt');
  const required = await getRequiredQuestionnaires(playerId);
  return result
    .filter(({ name, answeredAt }) => _.filter(result, { name }).length === 1 || answeredAt != null)
    .map((row) => ({ ...row, required: includes(required, row.name) }));
};

module.exports = {
  getUnansweredQuestionnaires,
  answerQuestionnaire,
  getQuestionnaires,
  getRequiredQuestionnaires,
  getQuestionnaireValidator,
};
