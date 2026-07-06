---
id: bounded-contexts-bets
title: Bets Bounded Context
sidebar_label: Bets Bounded Context
---

## Introduction

The Bets Bounded Context exposes functionality to handle bets.

## Public API

### Methods

- `placeBet(id: BetId, betData: BetData)`: submits a new bet. Returns either:
    * `BetPlacementSuccess(id)`: bet was placed correctly. 
    * `BetPlacementFailure(reason)`: something went wrong while placing the bet, provides cause.
- `betDetails(id: BetId)`: returns the details for a given bet. Returns:
    * `BetDetailsLookupSuccess(betId, status, betData)`: if bet data was available.
    * `BetDetailsLookupFailure(betId, reason)`: if something went wrong, providing the cause of the issue.
- `settleBetsFor(marketId: MarketId, winningSelectionId: SelectionId)`: tries to settle all bets for a given market and selectionId. Returns:
    * `BetSettlementResult(settledBets: Set[BetId], Set[BetSettlementFailedResponse])`: containing two lists with the ids for all successfully settled bets, and another list with the ids of all bets that failed to be settled together with the cause of the problem. 
