/* @flow */
const pickBy = require('lodash/fp/pickBy');
const sortBy = require('lodash/sortBy');
const objKeys = require('lodash/keys');
const moment = require('moment-timezone');
const crypto = require('crypto');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { emitSidebarStatusChanged } = require('../core/socket');
const { addEvent } = require('../players');

export type KycDocumentType = 'payment_method' | 'utility_bill' | 'identification' | 'other' | 'source_of_wealth';
export type KycDocumentStatus = 'new' | 'checked' | 'outdated' | 'requested' | 'declined';

export type KycDocument = {
  id: Id,
  status: KycDocumentStatus,
  type: KycDocumentType,
  expiryDate: Date,
  photoId: Id,
  name: string,
  fields: any,
};

export type KycDocumentDraft = {
  status?: KycDocumentStatus,
  expiryDate?: Date,
  photoId?: Id,
  name?: string,
  fields?: any,
  type?: KycDocumentType,
  content?: string,
  accountId?: string
};

export type Photo = {
  id: string,
  originalName: string,
};

const KYC_DOCUMENTS = 'kyc_documents';
const KYC_DOCUMENT_FIELDS = ['id', 'playerId', 'status', 'type', 'expiryDate', 'photoId', 'name', 'accountId', 'createdAt'];
const KYC_DOCUMENT_UPDATE_FIELDS = ['status', 'type', 'expiryDate', 'photoId', 'name', 'accountId', 'content', 'fields'];

const KYC_FIELDS = [
  'kyc_documents.id',
  'kyc_documents.status',
  'kyc_documents.type as documentType',
  'payment_methods.name as type',
  'kyc_documents.expiryDate',
  'kyc_documents.photoId',
  'kyc_documents.name',
  'accounts.account',
  'accounts.id as accountId',
  'kyc_documents.content',
  'kyc_documents.fields',
];

const objHash = (obj: any) => {
  const items = [];
  const keys = sortBy(objKeys<any>(obj));
  for (const key of Array.from(keys)) {
    if (obj[key] != null) { items.push(obj[key]); }
  }
  return items.join('|');
};

const calculateHash = (fields: any) => crypto.createHash('md5').update(objHash(fields)).digest('hex');
const getPlayerKycDocument = (playerId: Id, id: Id): Promise<KycDocument> =>
  pg('kyc_documents')
    .first(KYC_FIELDS)
    .leftOuterJoin('accounts', 'kyc_documents.accountId', 'accounts.id')
    .leftOuterJoin('payment_methods', 'accounts.paymentMethodId', 'payment_methods.id')
    .where({ 'kyc_documents.playerId': playerId, 'kyc_documents.id': id });

const getPlayerKycDocuments = (playerId: Id): Promise<KycDocument[]> =>
  pg('kyc_documents')
    .select('kyc_documents.id', 'kyc_documents.status', 'kyc_documents.type as documentType', 'payment_methods.name as type', 'kyc_documents.expiryDate', 'kyc_documents.photoId', 'kyc_documents.name', 'accounts.id as accountId', 'accounts.account', 'kyc_documents.content', 'kyc_documents.createdAt', 'kyc_documents.fields')
    .leftOuterJoin('accounts', 'kyc_documents.accountId', 'accounts.id')
    .leftOuterJoin('payment_methods', 'accounts.paymentMethodId', 'payment_methods.id')
    .where({ 'kyc_documents.playerId': playerId })
    .whereNot('kyc_documents.status', 'requested')
    .orderBy('kyc_documents.status')
    .orderBy('kyc_documents.type')
    .orderBy('kyc_documents.createdAt');

const getPlayerKycDocumentRequests = (playerId: Id): Promise<KycDocument[]> =>
  pg('kyc_requests')
    .select('kyc_documents.id', 'kyc_requests.id as requestId', 'kyc_documents.status', 'kyc_documents.type as documentType', 'payment_methods.name as type', 'kyc_documents.expiryDate', 'kyc_documents.photoId', 'kyc_documents.name', 'accounts.id as accountId', 'accounts.account', 'kyc_documents.content', 'kyc_documents.createdAt', 'kyc_documents.fields', 'users.handle')
    .innerJoin('kyc_documents', 'kyc_requests.id', 'kyc_documents.requestId')
    .leftOuterJoin('accounts', 'kyc_documents.accountId', 'accounts.id')
    .leftOuterJoin('users', 'kyc_requests.createdBy', 'users.id')
    .leftOuterJoin('payment_methods', 'accounts.paymentMethodId', 'payment_methods.id')
    .where({ 'kyc_requests.playerId': playerId, 'kyc_documents.status': 'requested' })
    .orderBy('kyc_documents.status')
    .orderBy('kyc_documents.type')
    .orderBy('kyc_requests.createdAt');


const hasValidDocument = async (playerId: Id, type: KycDocumentType): Promise<boolean> => {
  const [{ count }] = await pg(KYC_DOCUMENTS).count('*').where({ 'kyc_documents.playerId': playerId, status: 'checked', type });
  return Number(count) > 0;
};

const addKycDocument = async (playerId: Id, type: KycDocumentType, photoId: ?string, content: ?string, originalName: ?string, status: KycDocumentStatus, expiryDate: ?Date, accountId: ?Id, userId: ?Id, fields: any = {}, source: ?string, tx: Knex): Promise<boolean> => {
  const name = originalName || `@${moment().format('YYYYMMDDHHmmss')}`;
  const hash = source != null ? calculateHash(fields) : null;
  const r = [accountId, content, expiryDate, fields, hash, name, photoId, playerId, status, type, source].map(x => x === undefined ? null : x);  
  const { rows: [doc] } = await tx.raw(
    'insert into "kyc_documents" ("accountId", "content", "expiryDate", "fields", "hash", "name", "photoId", "playerId", "status", "type", "source") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) on conflict do nothing returning *',
    r,
  );
  if (doc == null) {
    return false;
  }
  await addEvent(playerId, userId, 'account', 'addKycDocument', { name: doc.name, documentId: doc.id }).transacting(tx);
  emitSidebarStatusChanged();
  return true;
};

const addPhotos = (playerId: Id, photos: Photo[], userId: ?Id): any =>
  pg.transaction(async (tx) => {
    const docs = await tx(KYC_DOCUMENTS)
      .insert(photos.map(photo => ({
        playerId,
        photoId: photo.id,
        name: photo.originalName,
      })))
      .returning('*');
    await Promise.all(docs.map(doc => addEvent(playerId, userId, 'account', 'addKycDocument', { name: doc.name, documentId: doc.id }).transacting(tx)));
    emitSidebarStatusChanged();
    return docs;
  });

const addContent = async (playerId: Id, content: string, userId: ?Id): Promise<any> =>
  pg.transaction(async (tx) => {
    const doc = await tx(KYC_DOCUMENTS)
      .insert({ playerId, content })
      .returning('*');
    await addEvent(playerId, userId, 'account', 'addKycDocument', { documentId: doc.id }).transacting(tx);
    emitSidebarStatusChanged();
    return doc;
  });

const addKycDocumentRequest = async (
  playerId: Id,
  request: { note?: string, message: ?string, requestAutomatically?: boolean },
  documents: { type: KycDocumentType, accountId: ?Id }[],
  userId: ?Id,
): Promise<any> =>
  pg.transaction(async (tx) => {
    const [{ id: requestId }] = await tx('kyc_requests')
      .insert({ playerId, note: request.note, message: request.message })
      .returning('id');
    await Promise.all(
      documents.map(({ type, accountId }) =>
        tx(KYC_DOCUMENTS).insert({ playerId, requestId, status: 'requested', type, accountId }),
      ),
    );
    await addEvent(
      playerId,
      userId,
      'account',
      'addKycDocumentRequest',
      { requestId, types: documents.map(({ type }) => type) },
      null,
      request.note,
    ).transacting(tx);
    emitSidebarStatusChanged();
  });

const updateKycDocument = async (
  documentId: Id,
  documentDraft: KycDocumentDraft,
  userId: Id,
): Promise<any> =>
  pg.transaction(async (tx) => {
    logger.debug('updateKycDocument', { documentId, userId }, documentDraft);
    const values = [];
    const updates = [];
    const x: any = documentDraft;
    KYC_DOCUMENT_UPDATE_FIELDS.forEach((field) => {
      const value = x[field];
      if (value !== undefined) {
        values.push(value);
        updates.push(`"${field}" = ?`);
      }
    });
    if (values.length === 0) {
      return [];
    }
    values.push(documentId);

    const r = await tx.raw(
      `
      UPDATE kyc_documents x
      SET    ${updates.join(',')}
      FROM  (SELECT * FROM kyc_documents WHERE id = ? FOR UPDATE) y
      WHERE  x.id = y.id
      RETURNING ${KYC_DOCUMENT_FIELDS.map((n) => `y."${n}" as "_${n}"`).join(
        ',',
      )}, ${KYC_DOCUMENT_FIELDS.map((n) => `x."${n}" as "${n}"`).join(',')}`,
      values,
    );

    if (r.rowCount !== 1) {
      throw Error(`Kyc document ${documentId} not found`);
    }

    const row = r.rows[0];
    await Promise.all(
      KYC_DOCUMENT_UPDATE_FIELDS.map(async (key) => {
        const oldValue = row[`_${key}`];
        const value = row[key];
        if (value !== oldValue) {
          const k: any = `kyc_documents.${key}`;
          await addEvent(row.playerId, userId, 'account', k, {
            documentId,
            value,
            oldValue,
          }).transacting(tx);
        }
      }),
    );
    emitSidebarStatusChanged();
    // $FlowFixMe[incompatible-call]
    return pickBy((value: any, key: string) => key[0] !== '_')(row);
  });

module.exports = {
  updateKycDocument,
  addContent,
  addPhotos,
  addKycDocument,
  hasValidDocument,
  getPlayerKycDocument,
  getPlayerKycDocuments,
  getPlayerKycDocumentRequests,
  addKycDocumentRequest,
};
