---
id: websocket-messages-wallets
title: WebSocket Messages - Wallets
sidebar_label: WebSocket - Wallets
---

## Introduction

This document provides a comprehensive description of the streamed updates emitted to the frontend regarding the **Wallets** domain.

### Wallets data updates

Bet updates always take the same form:

```json
{
  "channel": "wallets",
  "data": "<wallet data goes here>"
}
```

The `data` field contains the current status of the wallet.

#### Wallet balance changed

```json
{
  "channel": "wallets",
  "data": {
    "walletId": "997d33c0-83c3-4151-8a6e-a4be013d7030",
    "balance": {
      "bonusFunds": [],
      "realMoney": {
        "value": {
          "amount": 21.37,
          "currency": "USD"
        }
      }
    }
  }
}
```
