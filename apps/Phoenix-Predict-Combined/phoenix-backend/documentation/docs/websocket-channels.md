---
id: websocket-channels
title: WebSocket Channels
sidebar_label: WebSocket Channels
---

## Introduction

The Phoenix frontend receives streamed events from the backend through a series of channels. In order to access these events, the frontend needs to [subscribe](websocket-messages-channel-subscription.md#subscription-command-for-market-update-events) to a certain number of channels. It can also [unsubscribe](websocket-messages-channel-subscription.md#unsubscription-command-for-market-update-events) from them when required.

## Available channels

**Note: this list is pending to be complete**

- **market-data**: allows the frontend to access to market data updates for a *specific* `marketId`.
- **fixture-data**: allows the frontend to access to fixture data updates for a *specific* `fixtureId`.
- **bet-data**: allows the frontend to access to bet updates (i.e.: cancellation, settlements...) for a *specific* `punterId`.
- **wallet-data**: allows the frontend to access to bet updates (i.e.: balance) for a *specific* `walletId`.

