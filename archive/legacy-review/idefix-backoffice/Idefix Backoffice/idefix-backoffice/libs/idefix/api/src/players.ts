import { PREFIX } from "./";
import { FetchApi, PlayersAPI } from "./types";

export default (fetchApi: FetchApi): PlayersAPI => ({
  get: playerId => fetchApi(`${PREFIX}/player/${playerId}`),
  getByIds: playerIds => fetchApi(`${PREFIX}/player`, { params: { playerIds } }),
  getStatus: playerId => fetchApi(`${PREFIX}/player/${playerId}/status`),
  getFinancialInfo: playerId => fetchApi(`${PREFIX}/player/${playerId}/financial-info`),
  getRegistrationInfo: playerId => fetchApi(`${PREFIX}/player/${playerId}/registration-info`),
  getEvents: playerId => fetchApi(`${PREFIX}/player/${playerId}/events`),
  getNotes: playerId => fetchApi(`${PREFIX}/player/${playerId}/notes`),
  createNote: (playerId, content) =>
    fetchApi(`${PREFIX}/player/${playerId}/notes`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  archiveNote: (playerId, noteId) =>
    fetchApi(`${PREFIX}/player/${playerId}/notes/${noteId}/archive`, {
      method: "PUT",
    }),
  getTransactions: (playerId, { startDate, endDate, pageIndex, pageSize, text }) =>
    fetchApi(`${PREFIX}/player/${playerId}/transactions`, {
      params: {
        startDate,
        endDate,
        pageIndex,
        pageSize,
        text,
      },
    }),
  getTransactionDates: playerId => fetchApi(`${PREFIX}/player/${playerId}/transaction-dates`),
  getPaymentTransactions: (playerId, { status, pageIndex, pageSize, text }) =>
    fetchApi(`${PREFIX}/player/${playerId}/payments`, { params: { pageIndex, pageSize, status, text } }),
  getPaymentTransactionsEventLogs: (playerId, paymentId) =>
    fetchApi(`${PREFIX}/player/${playerId}/payments/${paymentId}/events`),
  completeDepositTransaction: (playerId, transactionKey, depositTransactionDraft) =>
    fetchApi(`${PREFIX}/player/${playerId}/transactions/${transactionKey}/complete`, {
      method: "post",
      body: JSON.stringify(depositTransactionDraft),
    }),
  cancelPaymentTransaction: (playerId, transactionKey) =>
    fetchApi(`${PREFIX}/player/${playerId}/payment-transactions`, {
      method: "delete",
      body: JSON.stringify({ playerId, transactionKey }),
    }),
  addTransaction: (playerId, values) =>
    fetchApi(`${PREFIX}/player/${playerId}/transactions`, {
      method: "post",
      body: JSON.stringify(values),
    }),
  getBonuses: playerId => fetchApi(`${PREFIX}/player/${playerId}/bonuses`),
  getAvailableBonuses: playerId => fetchApi(`${PREFIX}/player/${playerId}/bonuses/available`),
  creditBonus: (playerId, bonusDraft) =>
    fetchApi(`${PREFIX}/player/${playerId}/bonuses`, {
      method: "post",
      body: JSON.stringify(bonusDraft),
    }),
  createGamblingProblem: data =>
    fetchApi(`${PREFIX}/player/gamblingproblem`, {
      method: "post",
      body: JSON.stringify(data),
    }),
  forfeitBonus: (playerId, bonusId) =>
    fetchApi(`${PREFIX}/player/${playerId}/bonuses/${bonusId}`, {
      method: "delete",
    }),
  editPaymentWagering: (playerId, counterId, wageringRequirement) =>
    fetchApi(`${PREFIX}/player/${playerId}/counters/${counterId}`, {
      method: "put",
      body: JSON.stringify({ wageringRequirement }),
    }),
  getPaymentAccounts: playerId => fetchApi(`${PREFIX}/player/${playerId}/accounts`),
  addPaymentAccount: (playerId, data) =>
    fetchApi(`${PREFIX}/player/${playerId}/accounts`, {
      method: "post",
      body: JSON.stringify(data),
    }),
  addAccountDocument: (playerId, accountId, documentDraft) =>
    fetchApi(`${PREFIX}/player/${playerId}/accounts/${accountId}/documents`, {
      method: "post",
      body: JSON.stringify(documentDraft),
    }),
  updateAccountDocument: (playerId, accountId, documentId, documentDraft) =>
    fetchApi(`${PREFIX}/player/${playerId}/accounts/${accountId}/documents/${documentId}`, {
      method: "put",
      body: JSON.stringify(documentDraft),
    }),
  removeAccountDocument: (playerId, accountId, documentId) =>
    fetchApi(`${PREFIX}/player/${playerId}/accounts/${accountId}/documents/${documentId}`, {
      method: "delete",
    }),
  getAccountStatus: playerId => fetchApi(`${PREFIX}/player/${playerId}/account-status`),
  updateAccountStatus: (playerId, accountStatusDraft) =>
    fetchApi(`${PREFIX}/player/${playerId}/account-status`, {
      method: "put",
      body: JSON.stringify(accountStatusDraft),
    }),
  getActiveLimits: playerId => fetchApi(`${PREFIX}/player/${playerId}/active-limits`),
  getLimitsHistory: playerId => fetchApi(`${PREFIX}/player/${playerId}/limits`),
  setLimit: (playerId, type, values) =>
    fetchApi(`${PREFIX}/player/${playerId}/limits`, {
      method: "post",
      body: JSON.stringify({ type, values }),
    }),
  raiseLimit: (playerId, limitId, values) =>
    fetchApi(`${PREFIX}/player/${playerId}/limits/${limitId}`, {
      method: "post",
      body: JSON.stringify(values),
    }),
  cancelLimit: (limit, delay, reason) =>
    fetchApi(`${PREFIX}/limits/${limit.exclusionKey}`, {
      method: "delete",
      body: JSON.stringify({
        type: limit.type,
        delay: !!delay,
        reason,
      }),
    }),
  updateAccountActive: (playerId, accountId, active) =>
    fetchApi(`${PREFIX}/player/${playerId}/accounts/${accountId}`, {
      method: "put",
      body: JSON.stringify({ active }),
    }),
  updateAccountWithdrawals: (playerId, accountId, withdrawals) =>
    fetchApi(`${PREFIX}/player/${playerId}/accounts/${accountId}`, {
      method: "put",
      body: JSON.stringify({ withdrawals }),
    }),
  updateAccount: (playerId, accountId, account) =>
    fetchApi(`${PREFIX}/player/${playerId}/accounts/${accountId}`, {
      method: "put",
      body: JSON.stringify(account),
    }),
  update: (playerId, playerDraft) =>
    fetchApi(`${PREFIX}/player/${playerId}`, {
      method: "PUT",
      body: JSON.stringify(playerDraft),
    }),
  search: (tab, query, taskType) =>
    fetchApi(`${PREFIX}/player/search/${tab}`, {
      method: "POST",
      body: JSON.stringify({ brandId: query.brandId, query: query.text || "", filters: query.filters }),
      params: taskType ? { type: taskType } : null,
    }),
  getWithdrawals: playerId => fetchApi(`${PREFIX}/player/${playerId}/withdrawals`),
  getWithdrawal: withdrawalId => fetchApi(`${PREFIX}/withdrawals/${withdrawalId}`),
  getWithdrawalEvents: withdrawalId => fetchApi(`${PREFIX}/withdrawals/${withdrawalId}/events`),
  acceptWithdrawal: (playerId, withdrawalId, paymentProviderId, amount, parameters) =>
    fetchApi(`${PREFIX}/player/${playerId}/withdrawals/${withdrawalId}`, {
      method: "put",
      body: JSON.stringify({
        paymentProviderId,
        amount,
        parameters,
      }),
    }),
  confirmWithdrawal: (playerId, withdrawalId, externalTransactionId) =>
    fetchApi(`${PREFIX}/player/${playerId}/withdrawals/${withdrawalId}/confirm`, {
      method: "put",
      body: JSON.stringify({ externalTransactionId }),
    }),
  acceptWithdrawalWithDelay: (playerId, withdrawalId, paymentProviderId, amount, parameters) =>
    fetchApi(`${PREFIX}/player/${playerId}/withdrawals/${withdrawalId}/delay`, {
      method: "put",
      body: JSON.stringify({
        paymentProviderId,
        amount,
        parameters,
      }),
    }),
  refundGameRound: roundId =>
    fetchApi(`${PREFIX}/game-rounds/${roundId}`, {
      method: "put",
    }),
  closeGameRound: roundId =>
    fetchApi(`${PREFIX}/game-rounds/${roundId}`, {
      method: "delete",
    }),
  getPlayerFraud: (playerId, fraudId) => fetchApi(`${PREFIX}/player/${playerId}/frauds/${fraudId}`),
  checkPlayerFraud: (playerId, fraudId, fraudDraft) =>
    fetchApi(`${PREFIX}/player/${playerId}/frauds/${fraudId}`, {
      method: "put",
      body: JSON.stringify(fraudDraft),
    }),
  getTags: playerId => fetchApi(`${PREFIX}/player/${playerId}/tags`),
  addTag: (playerId, tag) =>
    fetchApi(`${PREFIX}/player/${playerId}/tags`, {
      method: "post",
      body: JSON.stringify({ tag }),
    }),
  removeTag: (playerId, tag) =>
    fetchApi(`${PREFIX}/player/${playerId}/tags/${tag}`, {
      method: "delete",
    }),
  getPromotions: playerId => fetchApi(`${PREFIX}/player/${playerId}/promotions`),
  getSegments: playerId => fetchApi(`${PREFIX}/player/${playerId}/segments`),
  suspendAccount: (playerId, reasons, note, accountClosed) =>
    fetchApi(`${PREFIX}/player/${playerId}`, {
      method: "delete",
      body: JSON.stringify({ reasons, note, accountClosed }),
    }),
  getGamesSummary: (playerId, { startDate, endDate }) =>
    fetchApi(`${PREFIX}/player/${playerId}/games-summary`, { params: { startDate, endDate } }),
  getPlayersWithClosedAccounts: playerId => fetchApi(`${PREFIX}/player/${playerId}/limits/closed-accounts`),
  getQuestionnaires: playerId => fetchApi(`${PREFIX}/player/${playerId}/questionnaires`),
  getStickyNote: playerId => fetchApi(`${PREFIX}/player/${playerId}/notes/sticky`),
  updateStickyNote: (playerId, content) =>
    fetchApi(`${PREFIX}/player/${playerId}/notes/sticky`, {
      method: "post",
      body: JSON.stringify({ content }),
    }),
  getRisks: (playerId, manualTrigger) => fetchApi(`${PREFIX}/player/${playerId}/risks?manualTrigger=${manualTrigger}`),
  getRisksByType: (playerId, riskType) => fetchApi(`${PREFIX}/player/${playerId}/risks/${riskType}`),
  getRisksLog: (playerId, riskType) => fetchApi(`${PREFIX}/player/${playerId}/risks/${riskType}/log`),
  getConnectedPlayers: playerId => fetchApi(`${PREFIX}/player/${playerId}/persons`),
  addPlayerConnection: (playerId, playerIds) =>
    fetchApi(`${PREFIX}/player/${playerId}/persons`, {
      method: "post",
      body: JSON.stringify({ playerIds }),
    }),
  disconnectPlayerFromPerson: playerId =>
    fetchApi(`${PREFIX}/player/${playerId}/persons`, {
      method: "delete",
    }),
  addManualTask: (playerId, risk) =>
    fetchApi(`${PREFIX}/player/${playerId}/frauds`, {
      method: "post",
      body: JSON.stringify(risk),
    }),
  getLedgers: (playerId, params) =>
    fetchApi(`/api/rewardserver/v1/players/${playerId}/ledgers-with-events`, { params }),
  markRewardUsed: (playerId, groupId, values) =>
    fetchApi(`/api/rewardserver/v1/players/${playerId}/ledgers/mark-used`, {
      method: "put",
      body: JSON.stringify({ ...values, groupId }),
    }),
  getRewards: (brandId, groupId) =>
    fetchApi(`/api/rewardserver/v1/rewards`, {
      params: {
        brandId,
        group: groupId,
      },
    }),
  addReward: (rewardId, { playerId, count, comment }) =>
    fetchApi(`/api/rewardserver/v1/rewards/${rewardId}/credit`, {
      method: "post",
      body: JSON.stringify({ playerId, count, comment }),
    }),
  getProgresses: (brandId, playerId) =>
    fetchApi(`/api/rewardserver/v1/${brandId}/progresses`, {
      params: { playerId },
    }),
  getBalances: (brandId, playerId) => fetchApi(`/api/rewardserver/v1/${brandId}/players/${playerId}/balance`),
  getInitGroups: () => fetchApi(`/api/rewardserver/v1/rewards/init-groups`),
  getCampaigns: (playerId, params) =>
    fetchApi(`/api/campaignserver/v1/players/${playerId}/content-sent`, {
      params,
    }),
  getActiveCampaigns: playerId => fetchApi(`/api/campaignserver/v1/players/${playerId}/campaigns`),
});
