package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis

import java.time.{ZoneOffset, ZonedDateTime}

import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis.dto.Event
import org.junit.runner.RunWith
import org.mockito.BDDMockito.`given`
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.{BeforeAndAfterAll, FunSuite}
import play.api.libs.json.Json

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future}

@RunWith(classOf[JUnitRunner])
class SISServiceTest extends FunSuite
  with MockitoSugar with BeforeAndAfterAll {

  private val sisStreamClientMock = mock[SISStreamClient]

  private val objectUnderTest = new SISService(sisStreamClientMock)

  override def beforeAll(): Unit = {
    given(sisStreamClientMock.callStreamingEvents())
      .willReturn(Future.successful(
        Json.parse(getClass.getClassLoader.getResourceAsStream("external/sis/sis_streamingevents.json"))
      ))
  }


  test("'getAvailableEvents()' should parse mock JSON") {
    // given

    // when
    val eventualActual = objectUnderTest.getAvailableEvents
    var actual = Await.result(eventualActual, Duration.Inf)

    // then
    actual should have size 2
    actual = ordered(actual)

    actual(0).streamId should be("c841098")
    actual(0).startDateUtc.toEpochSecond should be(ZonedDateTime.of(2020, 5, 3, 23, 0, 0, 0, ZoneOffset.UTC).toEpochSecond)
    actual(0).endDateUtc.toEpochSecond should be(ZonedDateTime.of(2020, 5, 4, 22, 59, 59, 0, ZoneOffset.UTC).toEpochSecond)
    actual(0).title should be(None)
    actual(0).sportId should be("OT")
    actual(0).sportName should be("Other")
    actual(0).competition should be("8 W&B")
    actual(0).country should be("WO")
    actual(0).blockedCountryCode.size should be(0)

    actual(1).streamId should be("c566008")
    actual(1).startDateUtc.toEpochSecond should be(ZonedDateTime.of(2020, 5, 4, 23, 0, 0, 0, ZoneOffset.UTC).toEpochSecond)
    actual(1).endDateUtc.toEpochSecond should be(ZonedDateTime.of(2020, 5, 5, 22, 59, 59, 0, ZoneOffset.UTC).toEpochSecond)
    actual(1).title should be(None)
    actual(1).sportId should be("OT")
    actual(1).sportName should be("Other")
    actual(1).competition should be("8 W&B")
    actual(1).country should be("WO")
    actual(1).blockedCountryCode.size should be(0)
  }


  private def ordered(actual: Seq[Event]) = {
    actual
      .sortBy(_.startDateUtc.toEpochSecond)
  }
}
