package phoenix.websockets.messages

import cats.data.Validated
import cats.syntax.apply._
import cats.syntax.validated._

import phoenix.CirceAkkaSerializable
import phoenix.bets.BetStateUpdate
import phoenix.core.error.PresentationErrorCode
import phoenix.http.BearerToken
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.wallets.domain.WalletStateUpdate
import phoenix.websockets.messages.WebSocketMessageConstants._

sealed trait IncomingMessage
sealed trait OutgoingMessage extends CirceAkkaSerializable

final case class Heartbeat() extends IncomingMessage with OutgoingMessage {
  val channel = HeartbeatChannel()
}

sealed trait Channel {
  val rawValue: String
}

final case class HeartbeatChannel() extends Channel {
  override val rawValue = HeartbeatKey
}

final case class BetsChannel() extends Channel {
  override val rawValue = BetsChannelKey
}

final case class WalletsChannel() extends Channel {
  override val rawValue = WalletsChannelKey
}

final case class MarketChannel(marketId: MarketId) extends Channel {
  override val rawValue = s"$MarketChannelKey$ChannelSeparator${marketId.value}"
}

final case class FixtureChannel(sportId: SportId, fixtureId: FixtureId) extends Channel {
  override val rawValue = s"$FixtureChannelKey$ChannelSeparator${sportId.value}$ChannelSeparator${fixtureId.value}"
}

object Channel {

  def fromString(str: String): Validated[String, Channel] = {
    str.split(s"\\$ChannelSeparator") match {
      case Array(BetsChannelKey)             => BetsChannel().valid
      case Array(WalletsChannelKey)          => WalletsChannel().valid
      case Array(MarketChannelKey, marketId) => MarketId.parse(marketId).map(MarketChannel(_))
      case Array(FixtureChannelKey, firstId, secondId) =>
        (SportId.parse(firstId), FixtureId.parse(secondId)).mapN(FixtureChannel.apply)
      case _ =>
        s"Expected 'channel' field value to be either '$BetsChannelKey' or to have the format '[channelKey]$ChannelSeparator[channelValue]' but received '$str'".invalid
    }
  }
}

final case class CorrelationId(value: String)

final case class Subscribe(correlationId: CorrelationId, token: Option[BearerToken], channel: Channel)
    extends IncomingMessage
final case class Unsubscribe(correlationId: CorrelationId, token: Option[BearerToken], channel: Channel)
    extends IncomingMessage

final case class SubscriptionSuccess(correlationId: CorrelationId, channel: Channel) extends OutgoingMessage
final case class SubscriptionFailure(correlationId: CorrelationId, channel: Channel, errorCode: PresentationErrorCode)
    extends OutgoingMessage

final case class UnsubscriptionSuccess(correlationId: CorrelationId, channel: Channel) extends OutgoingMessage
final case class UnsubscriptionFailure(correlationId: CorrelationId, channel: Channel, errorCode: PresentationErrorCode)
    extends OutgoingMessage

final case class Error(errorCode: PresentationErrorCode) extends OutgoingMessage

final case class FixtureUpdate(correlationId: CorrelationId, channel: Channel, data: FixtureStateUpdate)
    extends OutgoingMessage

final case class MarketUpdate(correlationId: CorrelationId, channel: Channel, data: MarketStateUpdate)
    extends OutgoingMessage

final case class BetUpdate(correlationId: CorrelationId, channel: Channel, data: BetStateUpdate) extends OutgoingMessage

final case class WalletUpdate(correlationId: CorrelationId, channel: Channel, data: WalletStateUpdate)
    extends OutgoingMessage
