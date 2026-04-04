/* @flow */
const isFunction = require('lodash/fp/isFunction');
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const { formatMoney } = require('../core/money');

export type EventType = 'fraud' | 'account' | 'activity' | 'transaction';

const reasonMappings = {
  multiple: 'Multiple accounts',
  fake: 'Fake details',
  fraudulent: 'Fraudulent behaviour',
  suspicious: 'Suspicious connections',
  ipcountry: 'IP/Country mismatch',
  underage: 'Underage',
};

const templates = {
  registration: ({ IPAddress }: {IPAddress: string}): string => (IPAddress ? `Registration from IP ${IPAddress}` : `Registration from unknown IP`),
  tooManyLogins: (): string => 'Too many invalid logins. Logins blocked.',
  invalidLoginAttempt: ({ IPAddress }: {IPAddress: string}): string => `Invalid login attempt from ${IPAddress}`,
  invalidLoginAttemptBlocked: ({ IPAddress }: {IPAddress: string}): string => `Invalid login attempt from ${IPAddress} - login temporary blocked`,
  loginCountryBlocked: ({ country }: {country: any}): string => `Login blocked from invalid country ${(country && country.id) || country}`,
  loginExclusionBlocked: (): string => 'Login blocked because of active limit',
  login: ({ IPAddress }: {IPAddress: string}): string => (IPAddress ? `Successful login from ${IPAddress}`: 'Successful login from unknown IP'),
  authenticate: ({ IPAddress }: {IPAddress: string}): string => `Successful authentication from ${IPAddress}`,
  logoutNewSession: (): string => 'Previous session killed on login',
  logout: (): string => 'Logged out',
  passwordChanged: (): string => 'Password changed',
  passwordSet: (): string => 'Password set',
  sessionExpired: (): string => 'Session expired',
  accountActivated: ({ IPAddress }: {IPAddress: string}): string => `Account activated from IP ${IPAddress || ''}`,
  connectPlayerToPerson: ({ playerId, pId }: { playerId: Id, pId: Id }): string => `Player ${playerId} connected to another player ${pId} as same person`,
  disconnectPlayerFromPerson: ({ playerId }: { playerId: Id }): string => `Player ${playerId} disconnected from person`,
  'activated.true': (): string => 'Player activated',
  'activated.false': (): string => 'Player activation disabled',
  'allowGameplay.true': ({ reason }: { reason: ?string }): string => `Game play enabled. ${reason != null ? (`"${reason}"`) : ''}`,
  'allowGameplay.false': ({ reason }: { reason: ?string }): string => `Game play disabled. ${reason != null ? (`"${reason}"`) : ''}`,
  'allowTransactions.true': ({ reason }: { reason: ?string }): string => `Allow transactions. ${reason != null ? (`"${reason}"`) : ''}`,
  'allowTransactions.false': ({ reason }: { reason: ?string }): string => `Disallow transactions. ${reason != null ? (`"${reason}"`) : ''}`,
  'verified.true': ({ reason }: { reason: ?string }): string => `Player identification verified. ${reason != null ? (`"${reason}"`) : ''}`,
  'verified.false': ({ reason }: { reason: ?string }): string => `Player identification verification removed. ${reason != null ? (`"${reason}"`) : ''}`,
  'loginBlocked.true': (): string => 'Player logins blocked',
  'loginBlocked.false': (): string => 'Player login block removed',
  'preventLimitCancel.true': (): string => 'Limit cancellation blocked',
  'preventLimitCancel.false': (): string => 'Limit cancellation block removed',
  'pendingDeposits.blocked': ({ pending }: { pending: number }): string => `Deposit blocked because of too many pending deposits (${pending})`,
  'accountClosed.true': (): string => 'Player account closed and email/phone released',
  'accountClosed.false': (): string => 'Player account closed and email/phone freed',
  'accountSuspended.true': (data: { reasons: ?string[], accountClosed: boolean }): string =>
    ['Player account closed',
      data.accountClosed ? ' and email/phone freed' : '',
      // $FlowFixMe[invalid-computed-prop]
      (data.reasons != null && data.reasons.length > 0 ? ` (reason: ${data.reasons.map(r => reasonMappings[r] || r).join(', ')})` : ''),
    ].join(''),
  'accountSuspended.false': (): string => 'Player account reopened',
  'players.allowEmailPromotions': ({ value }: { value: boolean }): string => (value ? 'E-mail promotions enabled with consent from player' : 'E-mail promotion consent removed'),
  'players.allowSMSPromotions': ({ value }: { value: boolean }): string => (value ? 'SMS promotions enabled with consent from player' : 'SMS promotion consent removed'),
  'players.activated': ({ value }: { value: boolean }): string => (value ? 'E-mail activation completed' : 'E-mail activation removed'),
  'players.testPlayer': ({ value }: { value: boolean }): string => (value ? 'Player flagged as test player' : 'Test player flag removed'),
  'players.email': ({ value, oldValue }: { value: string, oldValue: string }): string => `E-mail address changed to ${value} (${oldValue})`,
  'players.languageId': ({ value, oldValue }: { value: string, oldValue: string }): string => `Language changed to ${value} (${oldValue})`,
  'players.countryId': ({ value, oldValue }: { value: string, oldValue: string }): string => `Country changed to ${value} (${oldValue})`,
  'players.mobilePhone': ({ value, oldValue }: { value: string, oldValue: string }): string => `Mobile phone number changed to ${value} (${oldValue})`,
  'players.dateOfBirth': ({ value, oldValue }: { value: string, oldValue: string }): string => `Date of birth changed to ${moment(value).format('YYYY-MM-DD')}  (${oldValue})`,
  'players.city': ({ value, oldValue }: { value: string, oldValue: string }): string => `City changed to ${value} (${oldValue})`,
  'players.postCode': ({ value, oldValue }: { value: string, oldValue: string }): string => `Post code changed to ${value} (${oldValue})`,
  'players.address': ({ value, oldValue }: { value: string, oldValue: string }): string => `Street address changed to ${value} (${oldValue})`,
  'players.firstName': ({ value, oldValue }: { value: string, oldValue: string }): string => `First name changed to ${value} (${oldValue})`,
  'players.lastName': ({ value, oldValue }: { value: string, oldValue: string }): string => `Last name changed to ${value} (${oldValue})`,
  'players.tcVersion': ({ value }: { value: string }): string => `Player accepted Terms & Conditions version ${value}`,
  'players.nationalId': ({ value }: { value: string }): string => `Player national ID set to ${value}`,
  'players.emailStatus': ({ value, oldValue }: { value: string, oldValue: string }): string => `Email status changed to ${value} (${oldValue})`,
  'players.mobilePhoneStatus': ({ value, oldValue }: { value: string, oldValue: string }): string => `Mobile phone status changed to ${value} (${oldValue})`,
  'players.nationality': ({ value, oldValue }: { value: string, oldValue: string }): string => `Nationality changed to ${value} (${oldValue})`,
  'players.placeOfBirth': ({ value, oldValue }: { value: string, oldValue: string }): string => `Place of birth changed to ${value} (${oldValue})`,
  createAccount: ({ type, account, accountHolder }: { type: string, account: string, accountHolder?: string }): string => `Added new ${type} account ${account}${accountHolder != null ? ` owner ${accountHolder}` : ''}`,
  'updateAccount.active': ({ account, active }: { account: string, active: boolean }): string => `Set account ${account} activity ${active ? 'on' : 'off'}`,
  'updateAccount.withdrawals': ({ account, withdrawals }: { account: string, withdrawals: boolean }): string => `Set account ${account} withdrawals ${withdrawals ? 'on' : 'off'}`,
  'updateAccount.account': ({ account, oldAccount }: { account: string, oldAccount: string }): string => `Changed account ${oldAccount} number to ${account}`,
  'updateAccount.kycChecked': ({ account, kycChecked }: { account: string, kycChecked: boolean }): string => `Set account ${account} KYC checked status to ${kycChecked ? 'on' : 'off'}`,
  'kyc_documents.status': ({ value, oldValue, documentId }: { value: string, oldValue: string, documentId: Id }): string =>
    `Document ${documentId} status set to '${value}' ${oldValue ? `(${oldValue})` : ''}`,
  'kyc_documents.type': ({ value, oldValue, documentId }: { value: string, oldValue: string, documentId: Id }): string => `Document ${documentId} type set to '${value}' ${oldValue ? `(${oldValue})` : ''}`,
  'kyc_documents.expiryDate': ({ value, documentId }: { value: string, oldValue: string, documentId: Id }): string => `Document ${documentId} expiry date set to ${moment(value).format('YYYY-MM-DD')}`,
  'kyc_documents.photoId': ({ documentId }: { documentId: Id }): string => `Document ${documentId} photo changed`,
  'kyc_documents.name': ({ value, documentId }: { value: string, documentId: Id }): string => `Document ${documentId} added '${value}'`,
  'kyc_documents.accountId': ({ value, documentId }: { value: string, documentId: Id }): string => `Document ${documentId} added to account '${value}'`,
  playerCheck: ({ lists, matched, match, list }: { matched: boolean, lists: string[], match?: string, list?: string }): string => `Checked sanction lists: ${lists.join()}. Matches: ${match || (matched ? 'yes' : 'no')}${list ? ` (${list})` : ''}`,
  sanctionCheck: ({ lists, matched, match, list }: { matched: boolean, lists: string[], match?: string, list?: string }): string => `Checked sanction lists: ${lists.join()}. Matches: ${match || (matched ? 'yes' : 'no')}${list ? ` (${list})` : ''}`,
  addKycDocument: ({ documentId, name }: { documentId: Id, name: string }): string => `Document ${documentId} added ${name ? `(${name})` : ''}`,
  addKycDocumentRequest: ({ type }: { type: string[] }): string => `Documents of type {${type && type.join(', ')} requested`,
  fraudAdded: ({ description, note }: { description: string, note?: string }): string => [`Risk event triggered "${description}"`, note].filter(x => x != null).join('\n'),
  fraudCleared: ({ description, note }: { description: string, note?: string }): string => [`Risk event cleared "${description}"`, note].filter(x => x != null).join('\n'),
  fraudConfirmed: ({ description, note }: { description: string, note?: string }): string => [`Risk event confirmed "${description}"`, note].filter(x => x != null).join('\n'),
  acceptWithdrawal: ({ amount, message }: { message: string, amount: Money }): string => `Withdrawal accepted ${formatMoney(amount)} ${message ? `(${message})` : ''}`,
  cancelWithdrawal: ({ amount, message }: { message: string, amount: Money }): string => `Withdrawal cancelled ${formatMoney(amount)} ${message ? `(${message})` : ''}`,
  failedWithdrawal: ({ amount, message }: { message: string, amount: Money }): string => `Withdrawal processing failed ${formatMoney(amount)} ${message ? `(${message})` : ''}`,
  addCompensation: ({ amount, message }: { message: string, amount: Money }): string => `Compensation ${formatMoney(amount)} ${message ? `(${message})` : ''}`,
  addCorrection: ({ amount, message }: { message: string, amount: Money }): string => `Correction ${formatMoney(amount)} ${message ? `(${message})` : ''}`,
  createLimit: ({ type, periodType, reason, permanent, expires, limitValue }: { type: string, periodType: string, reason: string, permanent: boolean, expires: Date, limitValue: number }): string => `Set ${periodType || ''} ${type} limit ${['bet', 'loss', 'deposit_amount'].includes(type) ? formatMoney(limitValue) : (limitValue || '')} ${permanent ? '' : `expiring ${moment(expires).format('DD.MM.YYYY HH:mm')}`}. "${reason}"`,
  raiseLimit: ({ type, limitValue, reason }: { type: string, periodType: string, reason: string, permanent: boolean, expires: Date, limitValue: number }): string => `Raise ${type} limit to ${['bet', 'loss', 'deposit_amount'].includes(type) ? formatMoney(limitValue) : limitValue}. "${reason}"`,
  cancelLimit: ({ type, reason, delay }: { type: string, reason: string, delay: boolean }): string => `Cancelled ${type} limit ${delay ? ' with cooldown period' : ' immediately'}. "${reason}"`,
  'riskProfile.low': ({ reason }: { reason: string }): string => `Risk profile confirmed as low. "${reason || ''}"`,
  'riskProfile.medium': ({ reason }: { reason: string }): string => `Risk profile confirmed as medium. "${reason || ''}"`,
  'riskProfile.high': ({ reason }: { reason: string }): string => `Risk profile confirmed as high. "${reason}"`,
  adjustWagering: ({ transactionKey, wr, reason }: { transactionKey: string, wr: Money, reason: string }): string => `Adjust deposit ${transactionKey} wagering requirement by ${formatMoney(wr)}. "${reason || ''}"`,
  createWagering: ({ transactionKey, wr, reason }: { transactionKey: string, wr: Money, reason: string }): string => `Create deposit ${transactionKey} wagering requirement by ${formatMoney(wr)}. "${reason || ''}"`,
  setWagering: ({ transactionKey, wr, reason }: { transactionKey: string, wr: Money, reason: string }): string => `Changed deposit ${transactionKey} wagering requirement to ${formatMoney(wr)}. "${reason || ''}"`,
  'pep.true': ({ reason }: { reason: string }): string => `Player checked as Politically Exposed Person. "${reason || ''}"`,
  'pep.false': ({ reason }: { reason: string }): string =>  `Player checked as NOT Politically Exposed Person. "${reason || ''}"`,
  'sow.blockedTx': (): string => `Transaction blocked due to insufficient Source of Wealth clearance.`,
  'sow.blockedLogin': (): string => 'Login blocked due to rejected Source of Wealth information.',
  'sow.blockedRegistration': (): string => 'Registration blocked due to rejected Source of Wealth information on exiting account with matching email/phone.',
};

const addEvent = (playerId: Id, userId: ?Id, type: EventType, key: $Keys<typeof templates>, details: ?any, fraudId: ?Id, content?: ?string): Knex$QueryBuilder<void> =>
  pg('player_events').insert({ playerId, type, key, details, userId, fraudId, content });

const addNote = (playerId: Id, userId: ?Id, content: string, tx: Knex = pg): Knex$QueryBuilder<Array<{id: Id}>> =>
  tx('player_events').insert({ playerId, type: 'note', content, userId }).returning('*');

const queryPlayerEvents = async (playerId: Id, types: ?(EventType | 'note')[]): Promise<any> => {
  const query = pg('player_events')
    .select(
      'player_events.id as id',
      'type',
      'key',
      'content',
      'details',
      'fraudId',
      'player_events.createdAt',
      'users.handle',
      'users.id as userId',
      pg.raw('(player_events.id = "stickyNoteId") as "isSticky"'),
    )
    .innerJoin('players', 'players.id', 'player_events.playerId')
    .leftOuterJoin('users', 'users.id', 'player_events.userId')
    .where({ playerId, archived: false });

  if (types && types.length > 0) {
    query.whereRaw('player_events.type in (?)', types);
  }
  const events = await query.orderBy('player_events.createdAt', 'desc');
  return events.map(event =>
    Object.assign(event, {
      details: event.fraudId != null ? { ...event.details, fraudId: event.fraudId } : event.details,
      title: isFunction(templates[event.key]) ? templates[event.key](event.details || {}) : event.key,
      content: event.content,
    }));
};

const archiveNote = async (noteId: Id, playerId: Id): Promise<any> =>
  pg('player_events').where({ id: noteId, playerId, type: 'note' }).update({ archived: true });

module.exports = { addEvent, queryPlayerEvents, addNote, archiveNote };
