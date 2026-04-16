---
id: websocket-messages-bets
title: WebSocket Messages - Bets
sidebar_label: WebSocket - Bets
---

## Introduction

This document provides a comprehensive description of the streamed updates emitted to the frontend regarding the **Bets** domain.

### Bets data updates

Bet updates always take the same form:

```json
{
  "channel": "bets",
  "data": "<bet data goes here>"
}
```

The `data` field contains the current status of the bet.

#### Bet was opened

```json
{
  "channel": "bets",
  "data": {
    "betId": "997d33c0-83c3-4151-8a6e-a4be013d7030",
    "state": "OPENED",
    "winner": false
  }
}
```

#### Bet was cancelled

```json
{
  "channel": "bets",
  "data": {
    "betId": "997d33c0-83c3-4151-8a6e-a4be013d7030",
    "state": "CANCELLED",
    "winner": false
  }
}
```

#### Bet was settled

```json
{
  "channel": "bets",
  "data": {
    "betId": "997d33c0-83c3-4151-8a6e-a4be013d7030",
    "betData": {
      "punterId": "8c0b19f8-fd85-11ea-adc1-0242ac120002",
      "marketId": "market123",
      "selectionId": "selection123",
      "stake": {
         "amount": 100.0,
         "currency": "USD"
      },
      "odds": 1.01
    },
    "state": "SETTLED",
    "winner": true
  }
}
```

#### Bet failed

```json
{
  "channel": "bets",
  "data": {
    "betId": "997d33c0-83c3-4151-8a6e-a4be013d7030",
    "reason": "selectionOddsHaveChanged,insufficientFunds",
    "state": "FAILED",
    "winner": false
  }
}
```
