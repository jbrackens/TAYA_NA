---
id: bounded-contexts-wallets
title: Wallets Bounded Context
sidebar_label: Wallets Bounded Context
---

## Introduction

The Wallets Bounded Context exposes functionality to interact with punters' wallets.

## Public API

### Methods

- `reserveFunds(WalletId, BigDecimal)`: requests funds reservation for a given wallet ID and amount. Returns either:
    * `ReserveFundsSuccess(reservation)`: funds confirmation. Contains the txnId for the operation, and a list of reserved amounts. 
    * `ReserveFundsFailure(reason)`: express an error during the funds reservation process (i.e.: insufficient funds).
