package phoenix.markets.sports

import cats.data.NonEmptyList
import io.circe.Codec

import phoenix.core.JsonFormats._
import phoenix.core.validation.ValidationException
import phoenix.markets.sports.SportEntity._

object SportJsonFormats {

  def wrapValidationException(message: String) = NonEmptyList.one(ValidationException(message))

  implicit val sportIdCodec: Codec[SportId] =
    Codec[String].bimapValidated(_.value, SportId.parse(_).leftMap(wrapValidationException))

  implicit val tournamentIdCodec: Codec[TournamentId] =
    Codec[String].bimapValidated(_.value, TournamentId.parse(_).leftMap(wrapValidationException))

  implicit val fixtureIdCodec: Codec[FixtureId] =
    Codec[String].bimapValidated(_.value, FixtureId.parse(_).leftMap(wrapValidationException))

  implicit val competitorIdCodec: Codec[CompetitorId] =
    Codec[String].bimapValidated(_.value, CompetitorId.parse(_).leftMap(wrapValidationException))
}
