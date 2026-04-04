/* @flow */
import type {
  CashierConfig,
  CashierConfigBase,
  CashierConfigTxInfo,
  CashierConfigPmInfo,
} from './types';

const _ = require('lodash');

const CONFIGS: { [string]: CashierConfigBase } = {
  default: {
    fetchConfig: false,
    fixedProviderType: true,
    autoProcess: false,
    blockBrowserNavigation: true,
    containerHeight: '750px',
    containerWidth: '450px',
    accountDelete: false,
    alwaysShowSubmitBtn: true,
    country: '',
    displayLogoOrName: 'both',
    globalSubmit: true,
    history: true,
    hideTxOverview: false,
    errorMsgTxRefId: false,
    showFee: true,
    layout: 'horizontal',
    listType: 'grid',
    locale: '',
    logoUrl: '',
    pmListLimit: '8',
    predefinedAmounts: '50,100,200,500,1000',
    showAccounts: false,
    accountId: null,
    showReceipt: false,
    newPaymentBtn: false,
    showFooter: false,
    showAmount: false,
    showTransactionOverview: true,
    storeAccount: false,
    predefinedValues: false,
    showAmountLimits: false,
    singlePageFlow: true,
    allowMobilePopup: true,
    receiptBackBtn: true,
    theme: {
      input: {
        borderRadius: '15px',
      },
      error: {
        color: '#ED5F7B',
      },
      headerbackground: {
        color: '#9c72b6',
      },
      border: {
        radius: '15px',
      },
    },
  },
};

const makeConfig = (
  a: $Keys<typeof CONFIGS>,
  b: CashierConfigTxInfo,
  c: CashierConfigPmInfo,
): CashierConfig => _.merge(_.cloneDeep(_.get(CONFIGS, a)), b, c);

const create = (config: CashierConfig, urls: any): string => {
  const form = `<!DOCTYPE html>
  <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Cashier</title>
        <script type=text/javascript src='https://static.paymentiq.io/cashier/cashier.js'></script>
        <style> html, body { margin: 0px; overflow: hidden; } #cashier { height: 100vh; }</style>
    </head>
    <body>
      <div id='cashier'></div>
      <script>
        var txSuccessful = false;
        var CashierInstance = new _PaymentIQCashier('#cashier',
          JSON.parse(\`${JSON.stringify(config, null, 2)}\`),
          (api) => {
            api.on({
            cashierInitLoad: () => console.log('Cashier init load'),
            update: data => console.log('The passed in data was set', data),
            success: data => {
              console.log('Transaction was completed successfully', data);
              txSuccessful = true;
              window.top.location.href = "${urls.ok}";
            },
            failure: data => {
              console.log('Transaction failed', data);
              txSuccessful = false;
              window.top.location.href = "${urls.failure}";
            },
            pending: data => console.log('Transaction is pending', data),
            unresolved: data => console.log('Transaction is unresolved', data),
            isLoading: data => console.log('Data is loading', data),
            doneLoading: data => console.log('Data has been successfully downloaded', data),
            newProviderWindow: data => console.log('A new window / iframe has opened', data),
            paymentMethodSelect: data => console.log('Payment method was selected', data),
            paymentMethodPageEntered: data => console.log('New payment method page was opened', data),
            navigate: data => console.log('Path navigation triggered', data),
            cancelledPendingWD: data => console.log('A pending withdrawal has been cancelled', data),
            validationFailed: data => {
              console.log('Transaction attempt failed at validation', data);
              window.top.location.href = "${urls.failure}";
            },
            cancelled: data => {
              console.log('Transaction has been cancelled by user', data);
              setTimeout(() => {
                if (!txSuccessful) window.top.location.href = "${urls.failure}";
              }, 2000);
            },
            onLoadError: data => console.log('Cashier could not load properly', data),
            transactionInit: data => console.log('A new transaction has been initiated', data)
            })
          })
      </script>
    </body>
  </html>`;
  return form;
};

module.exports = { makeConfig, create };
