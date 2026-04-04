---
id: websocket-messages-markets
title: WebSocket Messages - Markets
sidebar_label: WebSocket - Markets
---

## Introduction

This document provides a comprehensive description of the streamed updates emitted to the frontend regarding the **Markets** domain.

### Market data updates

Any change to the state of a Market: name, lifecycle, selection odds, etc will trigger the entire state of the market to be sent to all subscribers.

#### Example

```json
{
  "channel": "market:4e15ff70-d90a-4e55-9f65-41eafedd4ccd",
  "data": {
    "marketId": "dc75c863-f34a-41ce-ba68-85b8a65debbc",
    "marketName": "First turret - map 1",
    "marketStatus": {
        "changeReason": {
            "status": "ACTIVE",
            "type": "ODDIN_CHANGE"
        },
        "type": "BETTABLE"
    },
    "marketType": "FIRST_TURRET",
    "selectionOdds": [
        {
            "active": true,
            "odds": 2.0900,
            "selectionId": "2",
            "selectionName": "away"
        },
        {
            "active": true,
            "odds": 1.6500,
            "selectionId": "1",
            "selectionName": "home"
        }
    ]
  }
}
```