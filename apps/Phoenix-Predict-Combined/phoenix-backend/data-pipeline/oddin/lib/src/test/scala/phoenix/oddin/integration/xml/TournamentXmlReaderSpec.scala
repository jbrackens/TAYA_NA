package phoenix.oddin.integration.xml

import cats.data.NonEmptyList
import cats.data.Validated.Valid
import cats.syntax.validated._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.TimeUtils._
import phoenix.core.XmlUtils._
import phoenix.core.validation.ValidationException
import phoenix.oddin.domain.OddinTournamentId
import phoenix.oddin.domain.Tournament
import phoenix.oddin.domain.TournamentName
import phoenix.oddin.domain.TournamentStartTime
import phoenix.oddin.infrastructure.xml.TournamentXmlReaders._
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeTournamentIdOps
import phoenix.support.FileSupport

class TournamentXmlReaderSpec extends AnyWordSpecLike with Matchers with FileSupport {

  "read a tournament" in {
    val sport = stringFromResource(baseDir = "data/domain", fileName = "tournament.xml").parseXml.convertTo[Tournament]

    sport shouldBe expectedTournament
  }

  "read a tournament with leading and trailing whitespace in attributes" in {
    val sport = stringFromResource(baseDir = "data/domain", fileName = "tournament-with-whitespace.xml").parseXml
      .convertTo[Tournament]

    sport shouldBe expectedTournament
  }

  "fail when reading a tournament with invalid id" in {
    val sport = stringFromResource(baseDir = "data/domain", fileName = "tournament-with-invalid-id.xml").parseXml
      .convertTo[Tournament]

    sport shouldBe InvalidAttributeValue(
      NonEmptyList.one(ValidationException(
        "An OddinTournamentId must have a format 'od:tournament:*' but received 'fasoifnapoidfnap'"))).invalidNel
  }

  private val expectedTournament = Valid(
    Tournament(
      OddinTournamentId.fromStringUnsafe(value = "od:tournament:862"),
      TournamentName("Asian DOTA2 Gold Occupation Competition S19"),
      TournamentStartTime("2020-10-28T23:00:00Z".toUtcOffsetDateTime)))
}
