---
id: bounded-contexts-markets
title: Markets Bounded Context
sidebar_label: Markets Bounded Context
---

## Introduction

The Markets Bounded Context allows checking on the status of markets.

## Public API

### Methods

- `isMarketBettable(marketId: MarketId, selectionId: SelectionId, odds: Odds)`: checks if a specific market currently allows bets. Returns either:
    * `MarketBettable(marketId, selectionId)`: market allows bets at this moment. 
    * `MarketNotBettable(marketId, selectionId, reason)`: market doesn't allow bets at this moment. Provides cause.
