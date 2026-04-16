---
id: punter-status-transitions
title: Punter's Status Transitions
sidebar_label: Punter's Status Transitions
---

## Introduction

A punter may have different status. We have rules to manage what transitions are valid.

## Punter Statuses
- `Active` - mostly all business functions are available for the punter with this status 
- `InCoolOff` - punter is in cool-off
- `Suspended` - punter is suspended by one of the next reasons:
    * `RegulatorSuspend` - punter is suspended by regulator
    * `NegativeBalance` - punter is suspended because it has negative balance in the wallet.
    * `OperatorSuspend` - punter is suspended by operator
- `SelfExcluded` - punter is self-excluded

### Statuses transitions
Punter status can be changed by setting `Cool-off`, `Suspended`, or `Self-excluded` flag.

## Setting flags
The table below shows what transitions are valid when we set a flag:

| From  \ To    | Cool-off | Suspended | Self-excluded |
|---------------|:--------:|:---------:|:-------------:|
| Active        |    ✅    |     ✅     |      ✅       |
| Cool-off      |     X    |     ✅     |      ✅       |
| Suspended     |    ❌    |      X     |      ✅       |
| Self-excluded |    ❌    |     ❌     |       X       |

## Unsetting flags
We can unset any flag at any punter status, but the resulting status depends on priorities of the remaining flags.

Flag priorities:
- When `Cool-off`, `Suspended`, `Self-excluded` flags are set, then punter status is `Self-excluded` because it has the highest priority.
- When only `Cool-off`, `Suspended` flags are set, then punter status is `Suspended` because it has the highest priority after `Self-excluded`.
- When only`Cool-off` flag is set, then punter status is `Cool-off`.
- When no flags are set, then punter status is `Active`.

## Self-exclude origins

You can transit to `Self-excluded` with one of the origins `Internal` (by Operator) or `External` (by DGE). 
But you will fail when you try override the origin with a next `Self-exclude` command.  
 
