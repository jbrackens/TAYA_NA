---
id: websocket-messages-fixtures
title: WebSocket Messages - Fixtures
sidebar_label: WebSocket - Fixtures
---

## Introduction

This document provides a comprehensive description of the streamed updates emitted to the frontend regarding the **Fixture** objects.

### Fixture data updates

Any change to the state of a Fixture: name, status, start time or score will trigger the entire state of the Fixture to be sent to all subscribers.

#### Example

```json
{
  "id": "f23797",
  "name": "Yangon Galacticos vs Army Geniuses",
  "startTime": "2021-02-17T05:05:00Z",
  "status": "IN_PLAY",
  "score": {
    "home": 1,
    "away": 3
  }
}
```