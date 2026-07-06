---
id: bounded-contexts
title: Bounded Contexts
sidebar_label: Overview
---

## Introduction

To quote from Wikipedia:

> Multiple models are in play on any large project. Yet when code based on distinct models is combined, software becomes buggy, unreliable, and difficult to understand. Communication among team members becomes confusing. It is often unclear in what context a model should not be applied.

> **Therefore:** Explicitly define the context within which a model applies. Explicitly set boundaries in terms of team organization, usage within specific parts of the application, and physical manifestations such as code bases and database schemas. Keep the model strictly consistent within these bounds, but don't be distracted or confused by issues outside and inside.
Bounded Contexts allow us to separate the application in multiple domains, controlling access of resources from each one. This document covers which bounded contexts our application is using and their general structure.

In Phoenix we have chosen to take the "Explicit" part above literally and define a `BoundedContext` trait. 

The `BoundedContext`:

* Defines the Public API used to interact with the sub-domain the bounded context represents.
* Provides the anti-corruption layer to the sub-domain, preventing internal implementations leaking out to the outside world.
* Can, in future, provide the _deployment_ boundary for the sub-domain (we currently deploy everything as single deployable unit, we may, if we choose deploy each bounded context independently.)

## Bounded Contexts in the Phoenix application

- [Betting](bounded-contexts-bets.md)
- [Punters](bounded-contexts-punters.md)
- [Markets](bounded-contexts-markets.md)
- [Wallets](bounded-contexts-wallets.md)

## Bounded Context structure

### Responsibilities

The Phoenix Bounded Contexts represent two modes of API behaviour:

- **Strict Request - Strict Response:** A single request is received, processed and a single reponse is returned. The response is _always_ async.
- **Strict Request - Streamed Response:** A single request is received, processed and a `StreamRef` is returned. The caller can then connect to this `StreamRef` and received a stream of events from the Bounded Context.

### Patterns/Principles

#### Bounded Context interface

The basis for each Bounded Context is a trait exposing the API methods for this particular domain. 

In order to ensure we:
 
* Support asynchronous execution patterns in these API methods.
* Handle failure scenarios from these API methods explicitly.
 
We use `EitherT` from the `cats` library. `EitherT` allows us to return an asynchronous `Either` product. 

For example:

```scala
trait WalletsBoundedContext {
  
  ...

  def deposit(walletId: WalletId, funds: Funds)(implicit ec: ExecutionContext): EitherT[Future, DepositError, Balance]

  ...
}
```

#### Bounded Context protocol

The output types are also defined by the Bounded Context. They are, by convention, defined in the same file as the Bounded Context trait and comprise a hierarchy of possible responses and errors that may occur in each of the operations represented in the public API.

For example, the `Wallets` API defines the following protocol objects:

```scala
object WalletsBoundedContextProtocol {

  // Errors
  sealed trait CreateWalletError extends InternalExceptionLike (1)
  sealed trait DepositError extends InternalExceptionLike
  sealed trait WithdrawError extends InternalExceptionLike
  sealed trait BalanceCheckError extends InternalExceptionLike
  sealed trait ReservationError extends InternalExceptionLike
  sealed trait SettlingBetError extends InternalExceptionLike
  sealed trait TransactionError extends InternalExceptionLike

  case class WalletAlreadyExistsError(id: WalletId) (2)
      extends BoundedContextException(s"Wallet walletId = [${id.unwrap}] already exists")
      with CreateWalletError

  ...

  case class UnexpectedWalletError(exception: Throwable) (3)
      extends BoundedContextException(s"Unexpected error [${exception.getMessage}]", underlying = Some(exception))
      with CreateWalletError
      with DepositError
      with BalanceCheckError
      with WithdrawError
      with ReservationError
      with SettlingBetError
      with TransactionError

  ...

``` 

1. There are several distinct error types defined - they all extend from `InternalExceptionLike` so that they can be converted to `DomainException`s as necessary and the context boundary.
2. Concrete implementations of those error types are defined as __`case classes`__
3. Unexpected errors are handled in the same way, errors can be shared by multiple methods by extends the appropriate traits.

#### Bounded Context implementation

The last step is to implement our Bounded Context.

Here, the companion object's `apply` method handles the setup and returns the instance of the class implementing the above trait.

```scala
object ActorWalletsBoundedContext {
  def apply(system: ActorSystem[Nothing], dbConfig: DatabaseConfig[JdbcProfile]): WalletsBoundedContext = {
    system.log.info("Wallets BoundedContext starting...")

    val config = WalletsConfig.of(system)

    WalletShardingRegion.initSharding(system, config)
    WalletsShardedDaemonProcess.initShardedDaemons(system, config.projections, dbConfig)

    val repository = new SlickWalletTransactionsRepository(dbConfig)
    new ActorWalletsBoundedContext(system, repository, config)
  }
}
```

The Bounded Context concrete class can implement the API methods in whicher way it chooses - we find there are 3 common patterns here:

1. `ask`ing to a specific `Entity` (the 'write' side)
2. Making a call to a repository (the 'read' side)
3. Starting a longer-running process (triggering an Akka stream, for instance, as happens in bet settling)

##### `ask`ing a specific `Entity`

For use-cases that need to favour consistency over availability and which can be serviced by a single `Entity` we can query an `Entity` directly using the `ask` pattern.

Here's an example from the implementation of the `WalletsBoundedContext` in `phoenix.wallets.ActorWalletsBoundedContext`

```scala
private lazy val sharding = ClusterSharding(system)

private def walletRef(walletId: WalletId): EntityRef[WalletCommand] =
  sharding.entityRefFor(WalletShardingRegion.TypeKey, walletId.unwrap)

override def deposit(walletId: WalletId, funds: Funds)(implicit
  ec: ExecutionContext): EitherT[Future, DepositError, Balance] =
EitherT(
  walletRef(walletId)(1)
    .ask(DepositFunds(walletId, funds, _)) (2)
    .transformWith(handleResponse({ (3)
      case success.CurrentBalance(_, balance) => Either.right(balance) (4)
      case failure.WalletNotFound(walletId)   => Either.left(WalletNotFoundError(walletId)) (5)
    })))
```

1. We get a reference to the entity we'll be `ask`ing
2. We `ask` by sending a Command from the `Entity` protocol
3. We use `transformWith` to handle a set of partial functions - if the response doesn't match what's in our block passed to `handleResponse`
4. We handle the success case 
5. We handle expected failure cases

There is always only one way to be successful but many ways to fail. However, there are less ways to fail in an expected way. It's those expected errors we handle here - unexpected errors (failures) are handled in the `handleReponse` partial function.

##### Calling a repository

For use-caase that need to favour availability over consistency (or, rather, those which _can_ favour availability), we can pull data from a repository - which will, usually, be backed by data stored in a database and which has been generated by a read-side projection.

For an example we reach this time to the `ActorMarketsBoundedContext`

```scala
override def getMarketDetails(marketId: MarketId)(implicit
      ec: ExecutionContext): EitherT[Future, MarketDetailsError, MarketDetails] =
    OptionT(repository.findByMarketId(marketId))
      .map {
        case (market, sport, fixture) =>
          MarketDetails(
            sport = SportSummary(sport.sportId, sport.name),
            fixture = FixtureSummary(fixture.fixtureId, fixture.name),
            marketId = market.marketId,
            marketName = market.name,
            status = market.statusHistory.last.lifecycleStatus,
            marketSpecifiers = market.specifiers,
            selections = market.selectionOdds)
      }
      .toRight(MarketNotFound(marketId))
```

Here, the `repository` is accessed and the result transformed into an `OptionT`.

##### Triggering a process

This last use-case is less common but we use this approach when settling bets for a market. We send the result for the market and then materialize an Akka Stream which processes the settling of bets. The call will eventually return the result of running the stream as the success response of the `Future`.

```scala
override def settleBetsFor(marketId: MarketId, winningSelectionId: SelectionId)(implicit
      ec: ExecutionContext): EitherT[Future, BetSettlementError, BetSettlementResult] = {
    EitherT.right(for {
      _ <- Future(log.info(s"Settling market $marketId with selection $winningSelectionId"))
      settlement <-
        allBetsForMarket(marketId)
          .mapAsync(100)(bet => startSettling(bet, winningSelectionId))
          .instrumentedPartial(name = "bet-settlement-stream", reportByName = true, perFlow = true)
          .runFold(SettlementResult.empty)((acc, settlement) => acc.withBetSettled(settlement))
      _ <- Future(log.info(s"Market $marketId settled"))
      result = BetSettlementResult(settlement.settledBets.map(_.betId), settlement.failedSettlements)
    } yield result)
  }
```

Here, we materialize a new stream for every market that is settled.

This uses a combination of both read and write side to do the work. The read side is queried to get a list of all bets for a specific market, then the Entities that represent those bets are sent messages to trigger them to start settling.

### Bounded Contexts access

Once defined, any component can access the Bounded Context public API by using the `apply` method on the object we just created. i.e.:

```scala
val walletsActorContext = ActorWalletsBoundedContext(ctx.system)
val reserveFundsResult = walletsActorContext.reserveFunds(betId, odds)
```

Notice it's at this point when we pass the requirements of our underlying implementation (i.e.: for an actor-based Wallets BC, the actor system) and instantiate the context. Ideally we'll use the application bootstrap to create these and distribute them to the domains that might need them as explicit dependencies.

### Testing

This approach makes mocking Bounded Contexts really simple (just using the same approach we followed to create the `WalletsBoundedContext` implementation), so you can make your own factory methods that instantiate the different combinations of mocked dependencies for the components you want to test.
