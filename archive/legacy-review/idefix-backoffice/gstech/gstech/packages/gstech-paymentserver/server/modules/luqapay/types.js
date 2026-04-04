/* @flow */
export type BankData = {
  bankName: string,
  swiftCode: string,
  activeAmount: {
    activeAmountId: number,
    amount: number,
   }[],
};
