package phoenix.markets.infrastructure

import io.circe.Codec
import io.circe.generic.semiauto._
import org.virtuslab.ash.annotation.SerializabilityTrait
import org.virtuslab.ash.annotation.Serializer
import org.virtuslab.ash.circe.Register
import org.virtuslab.ash.circe.Registration

import phoenix.CirceAkkaSerializable
import phoenix.core.odds.Odds
import phoenix.core.serialization.PhoenixAkkaSerialization
import phoenix.core.serialization.PhoenixCodecs
import phoenix.markets._
import phoenix.markets.domain.MarketType
import phoenix.markets.sports.SportEntity

@SerializabilityTrait
trait MarketsAkkaSerializable extends CirceAkkaSerializable

@Serializer(classOf[MarketsAkkaSerializable], Register.REGISTRATION_REGEX)
object MarketsAkkaSerialization extends PhoenixAkkaSerialization[MarketsAkkaSerializable] with PhoenixCodecs {

  private implicit lazy val fixtureIdCodec: Codec[SportEntity.FixtureId] = deriveCodec
  private implicit lazy val marketTypeCodec: Codec[MarketType] = deriveCodec
  private implicit lazy val marketCategoryCodec: Codec[MarketCategory] = deriveCodec
  private implicit lazy val marketSpecifierCodec: Codec[MarketSpecifier] = deriveCodec
  private implicit lazy val marketInfoCodec: Codec[MarketInfo] = deriveCodec
  private implicit lazy val lifecycleOperationalChangeReasonCodec: Codec[LifecycleOperationalChangeReason] = deriveCodec
  private implicit lazy val lifecycleCancellationReasonCodec: Codec[LifecycleCancellationReason] = deriveCodec
  private implicit lazy val marketLifecycleCodec: Codec[MarketLifecycle] = deriveCodec
  private implicit lazy val oddsCodec: Codec[Odds] = deriveCodec
  private implicit lazy val selectionOddsCodec: Codec[SelectionOdds] = deriveCodec
  private implicit lazy val marketSelectionsCodec: Codec[MarketSelections] = deriveCodec
  private implicit lazy val initializedMarketCodec: Codec[InitializedMarket] = deriveCodec
  private implicit lazy val marketIdCodec: Codec[MarketsBoundedContext.MarketId] = deriveCodec

  private implicit lazy val marketStateCodec: Codec[MarketState] = deriveCodec
  private implicit def marketCommandCodec: Codec[MarketProtocol.Commands.MarketCommand] = deriveCodec
  private implicit lazy val marketEventCodec: Codec[MarketProtocol.Events.MarketEvent] = deriveCodec
  private implicit lazy val marketResponseCodec: Codec[MarketProtocol.Responses.MarketResponse] = deriveCodec

  override def codecEntries: Seq[Registration[_ <: MarketsAkkaSerializable]] =
    List(
      Register[MarketState],
      Register[MarketProtocol.Commands.MarketCommand],
      Register[MarketProtocol.Events.MarketEvent],
      Register[MarketProtocol.Responses.MarketResponse])
}
