---
id: websocket-messages-channel-subscription
title: WebSocket Messages - Subscribing to channels
sidebar_label: WebSocket - Channel subscriptions
---

## Introduction

This document provides a comprehensive description of the messages shared between frontend and backend
during WebSocket-based communications that allow the frontend side to subscribe or unsubscribe to specific stream channels.

### Channel subscriptions

Each [channel](websocket-channels.md) has request messages that allow subscribing to and unsubscribing from them:

#### Subscription command for fixture update events

- Event: `subscribe`
- Channel: `fixture:<SportId>:<MarketId>`
- Request:

```json
{
  "event": "subscribe",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "fixture:s22:1234-1234-1234-1234"
}
```

Response:

```json
{
  "event": "subscribe:success",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "fixture:s22:1234-1234-1234-1234"
}
```

- Error response (invalid authorization):

```json
{
  "event": "subscribe:failure",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "fixture:s22:1234-1234-1234-1234",
  "error": "invalidAuthToken"
}
```

#### Unsubscription command for fixture update events:

- Event: `unsubscribe`
- Channel: `fixture:<SportId>:<MarketId>`
- Request:

```json
{
  "event": "unsubscribe",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "fixture:s22:1234-1234-1234-1234"
}
```

Response:

```json
{
  "event": "unsubscribe:success",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "fixture:s22:1234-1234-1234-1234"
}
```

- Error response (internal error):

```json
{
  "event": "unsubscribe:failure",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "fixture:s22:1234-1234-1234-1234",
  "error": "internalError"
}
```

#### Subscription command for market update events

- Event: `subscribe`
- Channel: `market:<MarketId>`
- Request:

```json
{
  "event": "subscribe",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "market:1234-1234-1234-1234"
}
```

Response:
```json
{
  "event": "subscribe:success",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "market:1234-1234-1234-1234"
}
```

- Error response (market not found):
```json
{
  "event": "subscribe:failure",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "market:1234-1234-1234-1234",
  "error": "marketNotFound"
}
```

#### Unsubscription command for market update events

- Event: `unsubscribe`
- Channel: `market:<MarketId>`
- Request:
```json
{
  "event": "unsubscribe",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "market:1234-1234-1234-1234"
}
```

Response:
```json
{
  "event": "unsubscribe:success",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "market:1234-1234-1234-1234"
}
```

- Error response (internal error):
```json
{
  "event": "unsubscribe:failure",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "market:1234-1234-1234-1234",
  "error": "internalError"
}
```

#### Subscription command for bets update events

- Event: `subscribe`
- Channel: `bets`
- Request:
```json
{
  "event": "subscribe",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "bets",
  "token": "valid-token"
}
```

Note: punterId is extracted from the provided **JWT token**.

Response:
```json
{
  "event": "subscribe:success",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "bets"
}
```

- Error response (punter not found):
```json
{
  "event": "subscribe:failure",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "bets",
  "error": "punterNotFound"
}
```

#### Unsubscription command for bets update events:

- Event: `unsubscribe`
- Channel: `bets`
- Request:
```json
{
  "event": "unsubscribe",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "bets",
  "token": "valid-token"
}
```

Note: punterId is extracted from the provided **JWT token**.

Response:
```json
{
  "event": "unsubscribe:success",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "bets"
}
```

- Error response (internal error):
```json
{
  "event": "unsubscribe:failure",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "bets",
  "error": "internalError"
}
```

#### Subscription command for wallets update events

- Event: `subscribe`
- Channel: `wallets`
- Request:
```json
{
  "event": "subscribe",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "wallets",
  "token": "valid-token"
}
```

Note: walletId is extracted from the provided **JWT token**.

Response:
```json
{
  "event": "subscribe:success",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "wallets"
}
```

- Error response (punter not found):
```json
{
  "event": "subscribe:failure",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "wallets",
  "error": "walletNotFound"
}
```

#### Unsubscription command for wallets update events:

- Event: `unsubscribe`
- Channel: `wallets`
- Request:
```json
{
  "event": "unsubscribe",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "wallets",
  "token": "valid-token"
}
```

Note: walletId is extracted from the provided **JWT token**.

Response:
```json
{
  "event": "unsubscribe:success",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "wallets"
}
```

- Error response (internal error):
```json
{
  "event": "unsubscribe:failure",
  "correlationId": "ABCD-ABCD-ABCD-ABCD",
  "channel": "wallets",
  "error": "internalError"
}
```
