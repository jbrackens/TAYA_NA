package phoenix.oddin.integration.xml

import cats.data.NonEmptyList
import cats.data.Validated.Valid
import cats.syntax.validated._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.XmlUtils._
import phoenix.core.validation.ValidationException
import phoenix.oddin.domain.OddinSportId
import phoenix.oddin.domain.Sport
import phoenix.oddin.domain.SportAbbreviation
import phoenix.oddin.domain.SportName
import phoenix.oddin.infrastructure.xml.SportXmlReaders._
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeSportIdOps
import phoenix.support.FileSupport

class SportXmlReaderSpec extends AnyWordSpecLike with Matchers with FileSupport {

  "read a sport" in {
    val sport = stringFromResource(baseDir = "data/domain", fileName = "sport.xml").parseXml.convertTo[Sport]

    sport shouldBe expectedSport
  }

  "read a sport with leading and trailing whitespace in attributes" in {
    val sport =
      stringFromResource(baseDir = "data/domain", fileName = "sport-with-whitespace.xml").parseXml.convertTo[Sport]

    sport shouldBe expectedSport
  }

  "fail when reading a sport with invalid id" in {
    val sport =
      stringFromResource(baseDir = "data/domain", fileName = "sport-with-invalid-id.xml").parseXml.convertTo[Sport]

    sport shouldBe InvalidAttributeValue(
      NonEmptyList.one(ValidationException(
        "An OddinSportId must have a format 'od:sport:*' but received 'this-id-has-incorrect__format'"))).invalidNel
  }

  private val expectedSport = Valid(
    Sport(
      OddinSportId.fromStringUnsafe(value = "od:sport:1"),
      SportName("League of Legends"),
      SportAbbreviation("LoL")))
}
