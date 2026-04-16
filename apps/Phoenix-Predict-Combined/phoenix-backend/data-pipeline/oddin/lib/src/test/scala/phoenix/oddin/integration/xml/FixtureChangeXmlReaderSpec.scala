package phoenix.oddin.integration.xml

import cats.data.Validated.Valid
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.XmlUtils._
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.fixtureChange.FixtureChange
import phoenix.oddin.infrastructure.xml.FixtureChangeXmlReaders._
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeSportEventIdOps
import phoenix.support.FileSupport

class FixtureChangeXmlReaderSpec extends AnyWordSpecLike with Matchers with FileSupport {

  "read a fixture change message" in {
    val fixtureChange =
      stringFromResource(baseDir = "data/amq", fileName = "fixture-change.xml").parseXml.convertTo[FixtureChange]

    fixtureChange shouldBe expectedFixtureChange
  }

  private val expectedFixtureChange = Valid(FixtureChange(OddinSportEventId.fromStringUnsafe(value = "od:match:19816")))
}
