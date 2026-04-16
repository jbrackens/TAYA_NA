package phoenix.core.websocket

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec
import org.virtuslab.ash.annotation.Serializer
import org.virtuslab.ash.circe.Register
import org.virtuslab.ash.circe.Registration

import phoenix.bets.BetData
import phoenix.bets.BetEntity
import phoenix.bets.BetStateUpdate
import phoenix.core.JsonFormats._
import phoenix.core.error.PresentationErrorCode
import phoenix.core.odds.Odds
import phoenix.core.serialization.PhoenixAkkaSerialization
import phoenix.core.serialization.PhoenixCodecs
import phoenix.markets.LifecycleCancellationReason
import phoenix.markets.LifecycleOperationalChangeReason
import phoenix.markets.MarketCategory
import phoenix.markets.MarketLifecycle
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.SelectionOdds
import phoenix.markets.domain.MarketType
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportEntity
import phoenix.punters.PunterEntity
import phoenix.wallets.WalletsBoundedContextProtocol
import phoenix.wallets.domain.Funds
import phoenix.wallets.domain.WalletStateUpdate
import phoenix.websockets.messages.Channel
import phoenix.websockets.messages.CorrelationId
import phoenix.websockets.messages.OutgoingMessage

@Serializer(classOf[PhoenixStateUpdate], Register.REGISTRATION_REGEX)
object OutgoingMessageSerialization extends PhoenixAkkaSerialization[PhoenixStateUpdate] with PhoenixCodecs {
  private implicit lazy val correlationIdCodec: Codec[CorrelationId] = deriveCodec
  private implicit lazy val marketIdCodec: Codec[MarketsBoundedContext.MarketId] = deriveCodec
  private implicit lazy val sportIdCodec: Codec[SportEntity.SportId] = deriveCodec
  private implicit lazy val fixtureIdCodec: Codec[SportEntity.FixtureId] = deriveCodec
  private implicit lazy val channelCodec: Codec[Channel] = deriveCodec
  private implicit lazy val presentationErrorCodeCodec: Codec[PresentationErrorCode] = deriveCodec
  private implicit lazy val fixtureLifecycleStatusCodec: Codec[FixtureLifecycleStatus] = deriveCodec
  private implicit lazy val fixtureScoreCodec: Codec[FixtureScore] = deriveCodec
  private implicit lazy val fixtureStateUpdateCodec: Codec[MarketsBoundedContext.FixtureStateUpdate] = deriveCodec
  private implicit lazy val marketTypeCodec: Codec[MarketType] = deriveCodec
  private implicit lazy val marketCategoryCodec: Codec[MarketCategory] = Codec[String].bimap(_.value, MarketCategory)
  private implicit lazy val lifecycleOperationalChangeReasonCodec: Codec[LifecycleOperationalChangeReason] = deriveCodec
  private implicit lazy val lifecycleCancellationReasonCodec: Codec[LifecycleCancellationReason] = deriveCodec
  private implicit lazy val marketLifecycleCodec: Codec[MarketLifecycle] = deriveCodec
  private implicit lazy val oddsCodec: Codec[Odds] = deriveCodec
  private implicit lazy val selectionOddsCodec: Codec[SelectionOdds] = deriveCodec
  private implicit lazy val marketStateUpdateCodec: Codec[MarketsBoundedContext.MarketStateUpdate] = deriveCodec
  private implicit lazy val betIdCodec: Codec[BetEntity.BetId] = deriveCodec
  private implicit lazy val punterIdCodec: Codec[PunterEntity.PunterId] = deriveCodec
  private implicit lazy val betDataCodec: Codec[BetData] = deriveCodec
  private implicit lazy val targetStateCodec: Codec[BetStateUpdate.TargetState] = deriveCodec
  private implicit lazy val betStateUpdateCodec: Codec[BetStateUpdate] = deriveCodec
  private implicit lazy val walletIdCodec: Codec[WalletsBoundedContextProtocol.WalletId] = deriveCodec
  private implicit lazy val realMoneyCodec: Codec[Funds.RealMoney] = deriveCodec
  private implicit lazy val bonusFundsCodec: Codec[Funds.BonusFunds] = deriveCodec
  private implicit lazy val balanceCodec: Codec[WalletsBoundedContextProtocol.Balance] = deriveCodec
  private implicit lazy val walletStateUpdateCodec: Codec[WalletStateUpdate] = deriveCodec
  implicit lazy val outgoingMessageCodec: Codec[OutgoingMessage] = deriveCodec

  override def codecEntries: Seq[Registration[_ <: PhoenixStateUpdate]] = {
    List(
      Register[BetStateUpdate],
      Register[WalletStateUpdate],
      Register[MarketsBoundedContext.MarketStateUpdate],
      Register[MarketsBoundedContext.FixtureStateUpdate])
  }
}
