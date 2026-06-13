---
id: bounded-contexts-user-sessions
title: User Sessions Bounded Context
sidebar_label: User Sessions Bounded Context
---

## Introduction

The User Sessions Bounded Context allows to handle user sessions (in order to allow communication with the frontend during user-related operations like login, log out or placing a bet).

## Public API

### Methods

- `startSession(sessionId: SessionId)`: starts a user session with the given sessionId from a frontend actor. Returns:
    * `ConnectSuccess(message)`: session was started correctly.
    * `ConnectionFailure(reason)`: something went wrong during the process, provides cause.
- `endSession(sessionId: SessionId)`: ends a user session with the given sessionId from a frontend actor. Returns:
    * `DisconnectSuccess(message)`: session was ended correctly.
    * `ConnectionFailure(reason)`: something went wrong during the process, provides cause.
- `placeBet(sessionId: SessionId, betId: BetId, betData: BetData)`: attempts to place a bet for a (currently open) sessionId. Returns:
    * `BetPlacementSuccess(message)`: Bet was placed successfully.
    * `BetPlacementFailure(reason)`: Bet placement process failed, provides the cause.