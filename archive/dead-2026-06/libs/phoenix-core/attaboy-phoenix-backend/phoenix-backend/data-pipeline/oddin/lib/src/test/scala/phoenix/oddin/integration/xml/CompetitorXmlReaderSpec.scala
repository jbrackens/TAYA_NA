package phoenix.oddin.integration.xml

import cats.data.NonEmptyList
import cats.data.Validated.Valid
import cats.syntax.validated._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.XmlUtils.InvalidAttributeValue
import phoenix.core.XmlUtils._
import phoenix.core.validation.ValidationException
import phoenix.oddin.domain.Competitor
import phoenix.oddin.domain.CompetitorAbbreviation
import phoenix.oddin.domain.CompetitorName
import phoenix.oddin.domain.CompetitorSide.Home
import phoenix.oddin.domain.OddinCompetitorId
import phoenix.oddin.infrastructure.xml.CompetitorXmlReaders._
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeCompetitorIdOps
import phoenix.support.FileSupport

class CompetitorXmlReaderSpec extends AnyWordSpecLike with Matchers with FileSupport {

  "read a competitor" in {
    val sport = stringFromResource(baseDir = "data/domain", fileName = "competitor.xml").parseXml.convertTo[Competitor]

    sport shouldBe expectedCompetitor
  }

  "read a competitor with leading and trailing whitespace in attributes" in {
    val sport =
      stringFromResource(baseDir = "data/domain", fileName = "competitor-with-whitespace.xml").parseXml
        .convertTo[Competitor]

    sport shouldBe expectedCompetitor
  }

  "fail when reading a competitor with invalid id" in {
    val sport =
      stringFromResource(baseDir = "data/domain", fileName = "competitor-with-invalid-id.xml").parseXml
        .convertTo[Competitor]

    sport shouldBe InvalidAttributeValue(
      NonEmptyList.one(ValidationException(
        "An OddinCompetitorId must have a format 'od:competitor:*' but received 'uuuu:competitor:2129'"))).invalidNel
  }

  private val expectedCompetitor = Valid(
    Competitor(
      OddinCompetitorId.fromStringUnsafe(value = "od:competitor:2129"),
      CompetitorName("Phoenix Gaming"),
      CompetitorAbbreviation("Phoenix Gaming"),
      Home))
}
