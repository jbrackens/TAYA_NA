// @flow

export type PayoutRecord = {
  paymentDetails: string,
  beneficiaryName: string,
  beneficiaryReference: string,
  beneficiaryIban: string,
  paymentAmount: string,
  currency: string,
  referenceId: string,
};

export type PayoutRequest = {
  merchantId: string,
  senderIban: string,
  description: string,
  callbackUrl: string,
  batchRecords: PayoutRecord[],
};

export type PayoutResponse = {
  batchId: string,
};

export type BatchState =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'PROCESSING'
  | 'COMPLETE'
  | 'FAILED'
  | 'CANCELLED'
  | 'SUCCEEDED'
  | 'WAITING_NETWORK'
  | 'REPROCESSING';

export type TransactionState = 'PENDING' | 'FAILED' | 'SUCCEEDED'

export type BatchStatusResponse = {
  state: BatchState,
};

export type TransactionDetail = {
  referenceId: string,
  status: TransactionState,
};

export type BatchDetailsResponse = {
  batchDetails: TransactionDetail[],
};
