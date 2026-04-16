package phoenix.bets.infrastructure
import io.circe.Codec
import io.circe.generic.semiauto._
import org.virtuslab.ash.annotation.SerializabilityTrait
import org.virtuslab.ash.annotation.Serializer
import org.virtuslab.ash.circe.Register
import org.virtuslab.ash.circe.Registration

import phoenix.CirceAkkaSerializable
import phoenix.bets._
import phoenix.core.JsonFormats._
import phoenix.core.odds.Odds
import phoenix.core.serialization.PhoenixAkkaSerialization
import phoenix.core.serialization.PhoenixCodecs
import phoenix.http.core.Geolocation
import phoenix.markets.MarketsBoundedContext
import phoenix.punters.PunterEntity
import phoenix.wallets.WalletsBoundedContextProtocol

@SerializabilityTrait
trait BetsAkkaSerializable extends CirceAkkaSerializable

@Serializer(classOf[BetsAkkaSerializable], Register.REGISTRATION_REGEX)
object BetsAkkaSerialization extends PhoenixAkkaSerialization[BetsAkkaSerializable] with PhoenixCodecs {
  private implicit lazy val punterIdCodec: Codec[PunterEntity.PunterId] = deriveCodec
  private implicit lazy val marketIdCodec: Codec[MarketsBoundedContext.MarketId] = namespacedIdCodec(
    MarketsBoundedContext.MarketId.parse)
  private implicit lazy val oddsCodec: Codec[Odds] = deriveCodec
  private implicit lazy val betDataCodec: Codec[BetData] = deriveCodec
  private implicit lazy val reservationIdCodec: Codec[WalletsBoundedContextProtocol.ReservationId] = deriveCodec
  private implicit lazy val geolocationCodec: Codec[Geolocation] = deriveCodec
  private implicit lazy val walletIdCodec: Codec[WalletsBoundedContextProtocol.WalletId] = deriveCodec
  private implicit lazy val reservationErrorCodec: Codec[WalletsBoundedContextProtocol.ReservationError] = deriveCodec
  private implicit lazy val betValidationErrorCodec: Codec[BetValidator.BetValidationError] = deriveCodec
  private implicit lazy val adminIdCodec: Codec[PunterEntity.AdminId] = deriveCodec
  private implicit lazy val betStatusCodec: Codec[BetState.Status] = deriveCodec
  private implicit lazy val betIdCodec: Codec[BetEntity.BetId] = deriveCodec

  private implicit lazy val betStateCodec: Codec[BetState] = deriveCodec
  private implicit def betCommandCodec: Codec[BetProtocol.Commands.BetCommand] = deriveCodec
  private implicit lazy val betEventCodec: Codec[BetProtocol.Events.BetEvent] = deriveCodec
  private implicit lazy val betResponseCodec: Codec[BetProtocol.Responses.BetResponse] = deriveCodec

  override def codecEntries: Seq[Registration[_ <: BetsAkkaSerializable]] =
    List(
      Register[BetState],
      Register[BetProtocol.Commands.BetCommand],
      Register[BetProtocol.Events.BetEvent],
      Register[BetProtocol.Responses.BetResponse])
}
