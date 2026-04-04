package phoenix.websockets

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter._
import akka.event.Logging
import akka.stream.ActorAttributes
import akka.stream.Attributes
import akka.stream.Supervision

import phoenix.bets.BetStateUpdate
import phoenix.core.error.PresentationErrorCode
import phoenix.core.websocket
import phoenix.core.websocket.EventStream
import phoenix.core.websocket.WebSocketFlow.FailureOr
import phoenix.core.websocket.WebSocketFlow.InvalidJson
import phoenix.http.BearerToken
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.Permissions.UserId
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.WalletStateUpdate
import phoenix.websockets.messages.BetUpdate
import phoenix.websockets.messages.BetsChannel
import phoenix.websockets.messages.CorrelationId
import phoenix.websockets.messages.Error
import phoenix.websockets.messages.FixtureChannel
import phoenix.websockets.messages.FixtureUpdate
import phoenix.websockets.messages.Heartbeat
import phoenix.websockets.messages.IncomingMessage
import phoenix.websockets.messages.MarketChannel
import phoenix.websockets.messages.MarketUpdate
import phoenix.websockets.messages.OutgoingMessage
import phoenix.websockets.messages.Subscribe
import phoenix.websockets.messages.SubscriptionFailure
import phoenix.websockets.messages.SubscriptionSuccess
import phoenix.websockets.messages.Unsubscribe
import phoenix.websockets.messages.UnsubscriptionFailure
import phoenix.websockets.messages.UnsubscriptionSuccess
import phoenix.websockets.messages.WalletUpdate
import phoenix.websockets.messages.WalletsChannel

class WebSocketChannelDispatchingMessageHandler(
    sessionId: SessionId,
    markets: EventStream[MarketId, MarketStateUpdate],
    fixtures: EventStream[FixtureId, FixtureStateUpdate],
    bets: EventStream[PunterId, BetStateUpdate],
    wallets: EventStream[WalletId, WalletStateUpdate],
    jwtAuthenticator: JwtAuthenticator)(implicit system: ActorSystem[_], ec: ExecutionContext)
    extends websocket.DynamicSourcesMessageHandler[IncomingMessage, OutgoingMessage](sessionId.value)(
      system.toClassic,
      ec) {

  private[this] val websocketSerializationError =
    Future.successful(Error(PresentationErrorCode.InvalidJson))

  private def channelDecider(channel: String): Supervision.Decider = { t =>
    log.info(s"Exception in channel $channel", t)
    Supervision.Restart
  }

  override def handle(failureOrMessage: FailureOr[IncomingMessage]): Future[Unit] = {
    failureOrMessage.fold(
      {
        case InvalidJson.Parsing(json, error) =>
          log.error(s"Cannot parse json '$json'", error)
          multiChannelStream.publishResponse(websocketSerializationError).map(_ => ())
        case InvalidJson.Decoding(json, error) =>
          log.error(s"Cannot decode json '$json'", error)
          multiChannelStream.publishResponse(websocketSerializationError).map(_ => ())
      },
      message =>
        multiChannelStream
          .publishResponse {
            message match {
              case _: Heartbeat => replyToHeartbeat()
              case Subscribe(correlationId, _, channel: FixtureChannel) =>
                subscribeToFixtureUpdates(correlationId, channel)
              case Subscribe(correlationId, token, channel: BetsChannel) =>
                subscribeToBetUpdates(correlationId, token, channel)
              case Subscribe(correlationId, token, channel: WalletsChannel) =>
                subscribeToWalletUpdates(correlationId, token, channel)
              case Subscribe(correlationId, _, channel: MarketChannel) =>
                subscribeToMarketUpdates(correlationId, channel)

              case Unsubscribe(correlationId, _, channel: FixtureChannel) =>
                unsubscribeFromFixtureUpdates(correlationId, channel)
              case Unsubscribe(correlationId, token, channel: BetsChannel) =>
                unsubscribeFromBetUpdates(correlationId, token, channel)
              case Unsubscribe(correlationId, token, channel: WalletsChannel) =>
                unsubscribeFromWalletUpdates(correlationId, token, channel)
              case Unsubscribe(correlationId, _, channel: MarketChannel) =>
                unsubscribeFromMarketUpdates(correlationId, channel)

              case other =>
                throw new RuntimeException(
                  s"Cannot match $other on ${classOf[WebSocketChannelDispatchingMessageHandler].getName}")
            }
          }
          .map(_ => ()))
  }

  private[this] def replyToHeartbeat(): Future[OutgoingMessage] =
    Future.successful(Heartbeat())

  private[this] def subscribeToBetUpdates(
      correlationId: CorrelationId,
      token: Option[BearerToken],
      channel: BetsChannel): Future[OutgoingMessage] = {
    validateToken(
      token,
      withIntrospection = true,
      errorCode => SubscriptionFailure(correlationId, channel, errorCode),
      userId => subscribeToBetUpdates(correlationId, PunterId(userId.value), channel))
  }

  private[this] def unsubscribeFromBetUpdates(
      correlationId: CorrelationId,
      token: Option[BearerToken],
      channel: BetsChannel): Future[OutgoingMessage] = {
    // We deliberately do NOT run token introspection when UNsubscribing from the channel.
    // When user logs out, it's hard for FE to ensure any specific relative timing of log out and channel unsubscription events...
    // hence it's pretty likely that when FE unsubscribes, the token is already marked as inactive in keycloak.
    // Note that we still check the regular token validity criteria, like matching signature etc.
    validateToken(
      token,
      withIntrospection = false,
      errorCode => UnsubscriptionFailure(correlationId, channel, errorCode),
      userId => unsubscribeFromBetUpdates(correlationId, PunterId(userId.value), channel))
  }

  private[this] def subscribeToWalletUpdates(
      correlationId: CorrelationId,
      token: Option[BearerToken],
      channel: WalletsChannel): Future[OutgoingMessage] = {
    validateToken(
      token,
      withIntrospection = true,
      errorCode => SubscriptionFailure(correlationId, channel, errorCode),
      userId => subscribeToWalletUpdates(correlationId, PunterId(userId.value), channel))
  }

  private[this] def unsubscribeFromWalletUpdates(
      correlationId: CorrelationId,
      token: Option[BearerToken],
      channel: WalletsChannel): Future[OutgoingMessage] =
    validateToken(
      token,
      withIntrospection = false,
      errorCode => UnsubscriptionFailure(correlationId, channel, errorCode),
      userId => unsubscribeFromWalletUpdates(correlationId, PunterId(userId.value), channel))

  private[this] def subscribeToFixtureUpdates(
      correlationId: CorrelationId,
      channel: FixtureChannel): Future[OutgoingMessage] = {
    fixtures
      .streamStateUpdates(channel.fixtureId)
      .map { result =>
        val channelId = channelIdForFixtureUpdates(channel.sportId.value, channel.fixtureId.value)
        val fixtureUpdates = result
          .map(data => FixtureUpdate(correlationId, channel, data))
          .log(s"[FixtureUpdates-$channelId]")
          .withAttributes(Attributes.logLevels(onElement = Logging.InfoLevel) and ActorAttributes.supervisionStrategy(
            channelDecider(channelId)))

        multiChannelStream.subscribe(channelId, fixtureUpdates)
        SubscriptionSuccess(correlationId, channel)
      }
      .recover {
        case e: Exception =>
          log.error(s"Subscribing to Fixture updates failed '${e.getMessage}'")
          SubscriptionFailure(correlationId, channel, PresentationErrorCode.InternalError)
      }
  }

  private[this] def unsubscribeFromFixtureUpdates(
      correlationId: CorrelationId,
      channel: FixtureChannel): Future[OutgoingMessage] = {
    multiChannelStream.unsubscribe(channelIdForFixtureUpdates(channel.sportId.value, channel.fixtureId.value))
    Future.successful(UnsubscriptionSuccess(correlationId, channel))
  }

  private[this] def subscribeToMarketUpdates(
      correlationId: CorrelationId,
      channel: MarketChannel): Future[OutgoingMessage] =
    markets
      .streamStateUpdates(channel.marketId)
      .map { result =>
        val channelId = channelIdForMarketUpdates(channel.marketId.value)
        val marketUpdates =
          result
            .map(marketData => MarketUpdate(correlationId, channel, marketData))
            .log(s"[MarketUpdates-$channelId]")
            .withAttributes(Attributes.logLevels(onElement = Logging.InfoLevel) and ActorAttributes.supervisionStrategy(
              channelDecider(channelId)))

        multiChannelStream.subscribe(channelId, marketUpdates)
        SubscriptionSuccess(correlationId, channel)
      }
      .recover {
        case e: Exception =>
          log.error(s"Subscribing to Market updates failed '${e.getMessage}'")
          SubscriptionFailure(correlationId, channel, PresentationErrorCode.InternalError)
      }

  private[this] def unsubscribeFromMarketUpdates(
      correlationId: CorrelationId,
      channel: MarketChannel): Future[OutgoingMessage] = {
    multiChannelStream.unsubscribe(channelIdForMarketUpdates(channel.marketId.value))
    Future.successful(UnsubscriptionSuccess(correlationId, channel))
  }

  private[this] def subscribeToBetUpdates(
      correlationId: CorrelationId,
      punterId: PunterId,
      channel: BetsChannel): Future[OutgoingMessage] =
    bets
      .streamStateUpdates(punterId)
      .map { result =>
        val channelId = channelIdForBetUpdates(punterId.value)
        val betUpdates = result
          .map(betData => BetUpdate(correlationId, channel, betData))
          .log(s"[BetUpdates-$channelId]")
          .withAttributes(Attributes.logLevels(onElement = Logging.InfoLevel) and ActorAttributes.supervisionStrategy(
            channelDecider(channelId)))

        multiChannelStream.subscribe(channelId, betUpdates)
        SubscriptionSuccess(correlationId, channel)
      }
      .recover {
        case e: Exception =>
          log.error(s"Subscribing to Bet updates failed '${e.getMessage}'")
          SubscriptionFailure(correlationId, channel, PresentationErrorCode.InternalError)
      }

  private[this] def unsubscribeFromBetUpdates(
      correlationId: CorrelationId,
      punterId: PunterId,
      channel: BetsChannel): Future[OutgoingMessage] = {
    multiChannelStream.unsubscribe(channelIdForBetUpdates(punterId.value))
    Future.successful(UnsubscriptionSuccess(correlationId, channel))
  }

  private[this] def subscribeToWalletUpdates(
      correlationId: CorrelationId,
      punterId: PunterId,
      channel: WalletsChannel): Future[OutgoingMessage] =
    wallets
      .streamStateUpdates(WalletId.deriveFrom(punterId))
      .map { result =>
        val channelId = channelIdForWalletUpdates(punterId.value)
        val walletUpdates = result
          .map(walletData => WalletUpdate(correlationId, channel, walletData))
          .log(s"[WalletUpdates-$channelId]")
          .withAttributes(Attributes.logLevels(onElement = Logging.InfoLevel) and ActorAttributes.supervisionStrategy(
            channelDecider(channelId)))

        multiChannelStream.subscribe(channelId, walletUpdates)
        SubscriptionSuccess(correlationId, channel)
      }
      .recover {
        case e: Exception =>
          log.error(s"Subscribing to Wallet updates failed '${e.getMessage}'")
          SubscriptionFailure(correlationId, channel, PresentationErrorCode.InternalError)
      }

  private[this] def unsubscribeFromWalletUpdates(
      correlationId: CorrelationId,
      punterId: PunterId,
      channel: WalletsChannel): Future[OutgoingMessage] = {
    multiChannelStream.unsubscribe(channelIdForWalletUpdates(punterId.value))
    Future.successful(UnsubscriptionSuccess(correlationId, channel))
  }

  private[this] def channelIdForFixtureUpdates(sportId: String, fixtureId: String) =
    s"fixture-updates-$sportId-$fixtureId"
  private[this] def channelIdForMarketUpdates(marketId: String) = s"market-updates-$marketId"
  private[this] def channelIdForBetUpdates(punterId: String) = s"bet-updates-$punterId"
  private[this] def channelIdForWalletUpdates(punterId: String) = s"wallet-updates-$punterId"

  private[this] def validateToken(
      token: Option[BearerToken],
      withIntrospection: Boolean,
      onFailure: PresentationErrorCode => OutgoingMessage,
      onSuccess: UserId => Future[OutgoingMessage]): Future[OutgoingMessage] = {
    token match {
      case None =>
        Future.successful(onFailure(PresentationErrorCode.MissingAuthToken))

      case Some(token) =>
        jwtAuthenticator.verify(token, withIntrospection = withIntrospection).value.flatMap {
          case Left(_)       => Future.successful(onFailure(PresentationErrorCode.InvalidAuthToken))
          case Right(claims) => onSuccess(claims.userId)
        }
    }
  }
}
