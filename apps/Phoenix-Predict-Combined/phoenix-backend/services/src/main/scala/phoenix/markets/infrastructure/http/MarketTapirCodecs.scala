package phoenix.markets.infrastructure.http

import cats.data.Validated
import cats.data.Validated.Invalid
import cats.data.Validated.Valid
import sttp.tapir.Codec
import sttp.tapir.DecodeResult

import phoenix.core.domain.NamespacedPhoenixId
import phoenix.core.validation.ValidationException
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId

object MarketTapirCodecs {

  private def decodeNamespacedIdentifier[T <: NamespacedPhoenixId](parse: String => Validated[String, T])(
      s: String): DecodeResult[T] = {
    parse(s) match {
      case Valid(value)   => DecodeResult.Value(value)
      case Invalid(error) => DecodeResult.Error(s, new ValidationException(error))
    }
  }

  implicit val marketIdCodec: Codec.PlainCodec[MarketId] =
    Codec.string.mapDecode(decodeNamespacedIdentifier(MarketId.parse))(_.value)

  implicit val sportIdCodec: Codec.PlainCodec[SportId] =
    Codec.string.mapDecode(decodeNamespacedIdentifier(SportId.parse))(_.value)

  implicit val tournamentIdCodec: Codec.PlainCodec[TournamentId] =
    Codec.string.mapDecode(decodeNamespacedIdentifier(TournamentId.parse))(_.value)

  implicit val fixtureIdCodec: Codec.PlainCodec[FixtureId] =
    Codec.string.mapDecode(decodeNamespacedIdentifier(FixtureId.parse))(_.value)
}
