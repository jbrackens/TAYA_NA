package phoenix

import scala.concurrent.Future
import scala.util.Random
import scala.util.Try

import akka.NotUsed
import akka.http.scaladsl.model.headers._
import akka.stream.scaladsl.Flow
import io.circe.Codec
import io.circe.Json
import io.circe.generic.semiauto.deriveCodec

import phoenix.Constants.Websockets._
import phoenix.WebSocketProtocol.IncomingWebsocketMessage
import phoenix.WebSocketProtocol.OutgoingWebsocketMessage
import phoenix.shared.Failures.FailedResponse

trait BetRequests extends BetFormats with HttpSupport with MarketRequests with WalletRequests with AsyncSupport {
  private lazy val publicApiUrl = Config.instance.phoenix.publicApiUrl

  private def placeBet(accessToken: String, geolocation: Geolocation, betRequest: BetRequest): Future[Json] = {
    log.info(s"Requesting bet placement...")

    postCodec[List[BetRequest], Json](
      s"$publicApiUrl/punters/bets",
      List(betRequest),
      Authorization(OAuth2BearerToken(accessToken)),
      GeolocationHeader(geolocation.value))
  }

  private def placeBetFailure(
      accessToken: String,
      geolocation: Geolocation,
      betRequest: BetRequest): Future[FailedResponse] =
    postCodec[List[BetRequest], FailedResponse](
      s"$publicApiUrl/punters/bets",
      List(betRequest),
      Authorization(OAuth2BearerToken(accessToken)),
      GeolocationHeader(geolocation.value))

  private def messageIsBetsChannelSubscriptionSuccess(channel: String, event: String): Boolean =
    channel == BetsChannel && event == SubscribeSuccess

  private def placeBetOnRandomMarket(
      punterId: String,
      accessToken: String,
      geolocation: Geolocation,
      amount: BigDecimal,
      currency: String): Json =
    await(for {
      _ <- creditFunds(punterId, amount, currency)
      market <- randomBettableMarket()
      selection = Random.shuffle(market.selectionOdds).head
      response <- placeBet(
        accessToken,
        geolocation,
        BetRequest(
          market.marketId,
          selection.selectionId,
          DefaultCurrencyMoney(amount, currency),
          selection.displayOdds.get.decimal,
          acceptBetterOdds = true))
    } yield response)

  def placeBetFailureOnRandomMarket(
      accessToken: String,
      geolocation: Geolocation,
      amount: BigDecimal,
      currency: String): FailedResponse =
    await(for {
      market <- randomBettableMarket()
      selection = Random.shuffle(market.selectionOdds).head
      response <- placeBetFailure(
        accessToken,
        geolocation,
        BetRequest(
          market.marketId,
          selection.selectionId,
          DefaultCurrencyMoney(amount, currency),
          selection.displayOdds.get.decimal,
          acceptBetterOdds = true))
    } yield response)

  def placeBetEffectFlow(
      accessToken: AuthToken,
      punterId: String,
      geolocation: Geolocation,
      amount: BigDecimal,
      currency: String): Flow[IncomingWebsocketMessage, IncomingWebsocketMessage, NotUsed] =
    Flow.fromFunction[IncomingWebsocketMessage, IncomingWebsocketMessage] {
      case message @ IncomingWebsocketMessage(_, channel, Some(event), _)
          if messageIsBetsChannelSubscriptionSuccess(channel, event) =>
        placeBetOnRandomMarket(punterId, accessToken.token, geolocation, amount, currency)
        message
      case message => message
    }

  def subscribeToBetUpdates(correlationId: String, token: String): OutgoingWebsocketMessage = {
    log.info("Subscribing to Web Socket bet updates channel")
    OutgoingWebsocketMessage(correlationId, event = "subscribe", channel = "bets", Some(token))
  }
}

trait BetFormats extends WalletFormat {
  case class BetRequest(
      marketId: String,
      selectionId: String,
      stake: DefaultCurrencyMoney,
      odds: BigDecimal,
      acceptBetterOdds: Boolean)

  implicit val betRequestCodec: Codec[BetRequest] = deriveCodec
}

final case class Geolocation(value: String)

private final class GeolocationHeader(value: String) extends ModeledCustomHeader[GeolocationHeader] {
  override def renderInRequests = true
  override def renderInResponses = true
  override val companion: GeolocationHeader.type = GeolocationHeader
  override def value: String = value
}
private object GeolocationHeader extends ModeledCustomHeaderCompanion[GeolocationHeader] {
  override val name = "X-Geolocation"
  override def parse(value: String): Try[GeolocationHeader] = Try(new GeolocationHeader(value))
}
