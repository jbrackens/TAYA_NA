/* @flow */
module.exports = (okUrl: string, failureUrl: string, qr: string, appPaymentLink: string): string => `
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css?family=Ubuntu" rel="stylesheet">
  <style>
  html, body {
    border: 0;
    padding: 0;
    margin: 0 auto;
    background-color: #f6f6f6;
    color: #1b1b1b;
    max-width: 500px;
    font-family: 'Ubuntu', sans-serif;
    font-size: 16px;
    text-align: center;
  }
  p {
    font-size: 18px;
  }
  .button {
    background-color: #4CAF50;
    border: none;
    color: white;
    padding: 15px 32px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
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
  .qr-code {
    width: 250px;
    height: 250px;
    align-self: center;
    margin: 20px;
  }
  </style>
</head>
<div class="wrapper">
  <h3>Please scan this code on your Jeton Wallet</h3>
  <img class="qr-code" src="data:image/jpeg;base64,${qr}">
  <p>Or click <a target="_blank" href="${appPaymentLink}">here</a></p>
  <div class="buttons">
    <a href="${failureUrl}" class="button negative">Cancel</a>
    <a href="${okUrl}" class="button">Continue</a>
  </div>
</div>
</html>`;
