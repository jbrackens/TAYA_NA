/* @flow */

export type EmpRequest = {
  OperationType: 'payment',
  Status: 'captured',
  Tid: string,
  Reference: string,
  Date: string,
  Amount: string,
  UserId: string,
  Message: string,
  '3DSecure': 'yes' | 'no',
  OneClick: 'yes' | 'no',
};
