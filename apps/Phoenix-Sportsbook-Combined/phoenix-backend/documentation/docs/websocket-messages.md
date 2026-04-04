---
id: websocket-messages
title: WebSocket Messages
sidebar_label: WebSocket Messages
---

## Introduction

This document provides a comprehensive description of the messages shared between frontend and backend during WebSocket-based communications. It also distinguishes between request/response communications (originated from requests submitted by the frontend) and stream communications that are inherently one-directional (backend to frontend). The latter also require the frontend side to request subscriptions to their events through messages that are also described in the following document.

## Authentication

For the frontend to be able to connect to the WebSocket, an initial unauthenticated request should be made under `/web-socket` route.

Once the web-socket connection is open, the token must be passed from frontend to backend as the `token` field within each request.
Every token provided by each request is validated by the backend,
which will return invalid results to requests from the frontend if for any reason the token expires or becomes invalid.

The JWT token also contains information about the punterId/brandId (exposed as custom claims) that can be required by some requests.

**Note: JWT validation is still WIP**.

### Regarding authentication and some WS clients

Some WS clients like `websocat` seem to have a limit on the amount of data can a user input (i.e.: pasting a large message to the console) that's unrelated to the size limit of a WS message. Due to the size of the JWT token in our headers, we recommend to use other clients, like the `Simple WebSocket Client` extensions for Firefox and Google Chrome.

## Request/response communications

Frontend can send requests to the backend expecting a response from them in order to subscribe/unsubscribe from stream channels:

- [WebSocket Messages for channel subscriptions](websocket-messages-channel-subscription.md)

## Authn

Every request from frontend (to subscribe/unsubscribe to/from a channel) requires a valid JWT token in the `token` field of the request. A missing or invalid JWT token in the request will trigger the following response:

```json
{
   "event": "error",
   "error": "invalidAuthToken"
}
```

## Serialization errors

If incoming messages from the frontend have any issues with formatting that prevent the backend to deserialize them, the following error message will be returned back:

```json
{
   "event": "error",
   "error": "invalidJson"
}
``` 

## Heartbeats

Once a frontend session subscribes to a stream channel, it'll receive new data from it as soon as the backend receives it from its providers.

Notice that the frontend is also responsible for **keeping the stream alive** but sending periodic heartbeat *pings* to the backend. Otherwise, the WebSocket stream will close after 75 seconds. 

```json
{
  "event": "heartbeat",
  "channel": "heartbeat"
}
```

- [WebSocket Messages for Markets](websocket-messages-markets.md)