/* @flow */
import type { BankData } from './types';

const { v1: uuid } = require('uuid');
const config = require('../../../config');

const create = (
  banks: BankData[],
  transactionKey: string,
  urls: URLFork,
  currency: string,
  formId: string = uuid(),
): string => {
  const form = `<html style="margin: 0; padding: 0">
    <head>
      <meta charset="utf-8"/>
      <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0"/>
      <style>
      html, body {
        border: 0;
        padding: 0;
        margin: 0 auto;
        background-color: #fff;
        color: #1b1b1b;
        max-width: 500px;
        font-family: 'Ubuntu', sans-serif;
        font-size: 20px;
        text-align: center;
      }
      p {
        font-size: 18px;
      }
      .button {
        background-color: #4CAF50;
        border: none;
        color: white;
        padding: 12px 22px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 20px;
      }
      .button.negative {
        background-color: #f44336;
      }
      .wrapper {
        display: flex;
        height: 100%;
        width: 100%;
        max-height: 500px;
        flex-direction: column;
        justify-content: center;
        align-content: center;
      }
      .buttons {
        display: flex;
        width: 100%;
        justify-content: space-around;
      }
      .select {
        width: 150px;
        padding-top: 14px;
        padding-right: 13px;
        padding-left: 13px;
        padding-bottom: 15px;
        margin-left: 20px;
        margin-right: 20px;
        background-image: initial;
        background-position-x: initial;
        background-position-y: initial;
        background-size: initial;
        background-repeat-x: initial;
        background-repeat-y: initial;
        background-attachment: initial;
        background-origin: initial;
        background-clip: initial;
        background-color: rgb(246, 246, 248);
        border-top-left-radius: 5px;
        border-top-right-radius: 5px;
        border-bottom-right-radius: 5px;
        border-bottom-left-radius: 5px;
        color: rgb(63, 63, 63);
        border-top-width: initial;
        border-right-width: initial;
        border-bottom-width: initial;
        border-left-width: initial;
        border-top-style: none;
        border-right-style: none;
        border-bottom-style: none;
        border-left-style: none;
        border-top-color: initial;
        border-right-color: initial;
        border-bottom-color: initial;
        border-left-color: initial;
        border-image-source: initial;
        border-image-slice: initial;
        border-image-width: initial;
        border-image-outset: initial;
        border-image-repeat: initial;
        -webkit-appearance: none;
        font-style: normal;
        font-weight: normal;
        font-size: 16px;
        line-height: 20px;
      }
      .label {
        font-family: "Titillium Web", sans-serif;
      }
      </style>
    </head>
    <body style="margin: 0; padding: 0">
    <table>
      ${(banks || [])
        .map(
          (
            bank,
          ) => `<tr><form action="${`${config.server.public}/api/v1/luqapay/process?transactionKey=${transactionKey}`}" method="POST" id="form_${formId}" target="_parent">
      <td><span class="label">${bank.bankName}</span></td>
      <td><select id="amount" name="amount" class="select">
        ${bank.activeAmount
          .map((a) => `<option value="${a.activeAmountId}_${a.amount}">${a.amount} ${currency}</option>`)
          .join('')}
      </select></td>
      <td>
        <input type="hidden" name="swiftCode" value="${bank.swiftCode}"/>
        <input type="hidden" name="ok" value="${urls.ok}"/>
        <input type="hidden" name="failure" value="${urls.failure}"/>
        <input type="submit" value=">" class="button" />
      </td>
    </form></tr>`,
        )
        .join('')}
    </body>
  </html>`;
  return form;
};

module.exports = { create };
