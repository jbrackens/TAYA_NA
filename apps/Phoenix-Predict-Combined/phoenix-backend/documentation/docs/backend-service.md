---
id: backend-service
title: Backend Service
sidebar_label: Backend Service
---

## Overview

The Backend service provides the core functionality for the Phoenix system. It manages:

* Market data - available sports, fixture and markets and the odds of the market selections.
* Customer Wallets - both "real" money and bonus funds.
* Responsible Gambling - controlling each Customer's availability to gamble and monitoring their activities.
* Customer Betting - ensuring that customers can place bets in compliance with applicable regulations.

## Architecture

The Backend service is a _Distributed Monolith_ with some _Microservice_ characteristics.

If Microservices are defined as services isolated by:

* Space - services can be deployed anywhere, their locations are merely an implementation detail.
* Time - services interact with each asynchronously and have their own sense of time, when needed.
* Failure - failures in one service are isolated within that service and won't cause a cascade failure.
* State - each service maintains its own state as necessary and other services cannot access it, except through a clearly defined API

Then the Backend Service meets all but (1) - the Backend service is deployed as a single unit but each subdomain is isolated from the others as much as possible and they interact through a strict API definition.

## Bounded Contexts

The subdomain within the Backend service are referred to as `Bounded Contexts` and are described in more detail [here](bounded-contexts.md).

## Implementation

The Backend Service build as an Akka Cluster application and makes heavy use of the Event Sourcing and CQRS patterns.

Each bounded context within the service has one or more Entities, implemented by Sharded Persistent Actors which hold their current state in memory, have a single-source-of-truth in the form of an event journal and emit events which can optionally be consumed by handlers implemented using Akka Projections.

## Deployment

The Backend Service is deployed using Helm charts located in the main repository.
