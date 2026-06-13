package phoenix.markets.infrastructure

import io.circe.Codec
import io.circe.generic.semiauto._
import org.virtuslab.ash.annotation.SerializabilityTrait
import org.virtuslab.ash.annotation.Serializer
import org.virtuslab.ash.circe.Register
import org.virtuslab.ash.circe.Registration

import phoenix.CirceAkkaSerializable
import phoenix.core.JsonFormats._
import phoenix.core.serialization.PhoenixAkkaSerialization
import phoenix.core.serialization.PhoenixCodecs
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.sports.Competitor
import phoenix.markets.sports.Fixture
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportEntity
import phoenix.markets.sports.SportProtocol
import phoenix.markets.sports.SportState
import phoenix.markets.sports.Tournament

@SerializabilityTrait
trait MarketsSportsAkkaSerializable extends CirceAkkaSerializable

@Serializer(classOf[MarketsSportsAkkaSerializable], Register.REGISTRATION_REGEX)
object MarketsSportsAkkaSerialization
    extends PhoenixAkkaSerialization[MarketsSportsAkkaSerializable]
    with PhoenixCodecs {

  private implicit lazy val competitorCodec: Codec[Competitor] = deriveCodec
  private implicit lazy val fixtureScoreCodec: Codec[FixtureScore] = deriveCodec
  private implicit lazy val fixtureLifecycleStatusCodec: Codec[FixtureLifecycleStatus] = deriveCodec
  private implicit lazy val sportCodec: Codec[MarketsBoundedContext.Sport] = deriveCodec
  private implicit lazy val fixtureCodec: Codec[Fixture] = deriveCodec
  private implicit lazy val tournamentCodec: Codec[Tournament] = deriveCodec
  private implicit lazy val matchScoreCodec: Codec[SportProtocol.Commands.MatchScore] = deriveCodec
  private implicit lazy val sportIdCodec: Codec[SportEntity.SportId] = deriveCodec
  private implicit lazy val competitorIdCodec: Codec[SportEntity.CompetitorId] = deriveCodec
  private implicit lazy val fixtureIdCodec: Codec[SportEntity.FixtureId] = deriveCodec
  private implicit lazy val tournamentIdCodec: Codec[SportEntity.TournamentId] = deriveCodec

  private implicit lazy val sportStateCodec: Codec[SportState] = deriveCodec
  private implicit def sportCommandCodec: Codec[SportProtocol.Commands.SportCommand] = deriveCodec
  private implicit lazy val sportEventCodec: Codec[SportProtocol.Events.SportEvent] = deriveCodec
  private implicit lazy val sportResponseCodec: Codec[SportProtocol.Responses.SportResponse] = deriveCodec

  override def codecEntries: Seq[Registration[_ <: MarketsSportsAkkaSerializable]] =
    List(
      Register[SportState],
      Register[SportProtocol.Commands.SportCommand],
      Register[SportProtocol.Events.SportEvent],
      Register[SportProtocol.Responses.SportResponse])
}
