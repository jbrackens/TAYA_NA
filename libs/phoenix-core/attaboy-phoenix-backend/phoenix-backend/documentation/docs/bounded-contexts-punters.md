---
id: bounded-contexts-punters
title: Punters Bounded Context
sidebar_label: Punters Bounded Context
---

## Introduction

The Punters Bounded Context exposes functionality to interact with punters.

## Public API

### Methods

- `canPunterBet(id: PunterId)`: checks if a Punter is currently allowed to bet. Returns either:
    * `PunterCanBet(id)`: punter can bet at this time. 
    * `PunterCannotBetFailure(reason)`: punter is not allowed to bet, also providing the cause.

- `streamBetEvents(id: PunterId)`: returns a stream of bet events coming from Bets Bounded Context. Returns:
    * `SourceRef[BetStateUpdate]`: streaming source to receive events from.
    
- `deliverBetUpdates(id: PunterId, updates: Seq[BetStateUpdate])`: allows Bets Bounded Context to submit streaming events. Punter Bounded Context is responsible for containing the stream emitter and delivering the streams to the frontend sockets subscribed to the bets of this punter. Acts in a *fire-and-forget* fashion, no returned value.