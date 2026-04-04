package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sis

import java.time.{LocalDate, LocalDateTime, ZoneOffset, ZonedDateTime}

import net.flipsports.gmx.common.internal.partner.commons.cons.{SportType, StreamingModelType}
import net.flipsports.gmx.common.internal.partner.sis.league.SISSupportedLeagues
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.{ProviderType, StreamingStatusType}
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.PageEvent
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis.{SISService, SISStreamClient}
import org.junit.runner.RunWith
import org.mockito.BDDMockito.`given`
import org.mockito.Mockito
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.{BeforeAndAfterEach, FunSuite}
import play.api.libs.json.Json
import test.shared.InternalObjectSupport

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future}

@RunWith(classOf[JUnitRunner])
class SISStreamingProviderTest extends FunSuite with MockitoSugar
  with InternalObjectSupport with BeforeAndAfterEach {

  private val sisStreamClientMock: SISStreamClient = mock[SISStreamClient]
  private val timeServiceMock: TimeService = mock[TimeService]

  private var objectUnderTest: SISStreamingProvider = _


  override protected def beforeEach(): Unit =
    initDefaults()

  private def initDefaults(): Unit = {
    Mockito.reset()

    setClock(LocalDateTime.now())

    constructSubject()
  }

  private def constructSubject(): Unit = {
    `given`(sisStreamClientMock.callStreamingEvents())
      .willReturn(Future.successful(
        Json.parse(getClass.getClassLoader.getResourceAsStream("external/sis/sis_streamingevents.json"))
      ))

    val sisService = new SISService(sisStreamClientMock)
    val cache = new SISEventsCache(sisService, new SISEventsCacheConfig(false, Duration.Zero))
    Await.result(cache.runScheduled(), Duration.Inf)

    objectUnderTest = new SISStreamingProvider(sisService, cache, new SISSupportedLeagues, timeServiceMock)
  }

  test("'getMapping()' should return fullday stream by event time") {
    // given
    val givenEvent = PageEvent(123, SportType.HORSE_RACING, "Gavea", ZonedDateTime.of(2020, 5, 4, 20, 55, 0, 0, ZoneOffset.UTC), "6 1/2f Stakes", "BR")

    objectUnderTest.reload(LocalDate.of(2020, 5, 3), LocalDate.of(2020, 5, 7))

    // when
    val actual = objectUnderTest.getMapping(givenEvent)

    // then
    actual.isDefined should be(true)
    actual.head.provider should be(ProviderType.SIS)
    actual.head.id should be("c841098")
    actual.head.startTime.toEpochSecond should be(ZonedDateTime.of(2020, 5, 3, 23, 0, 0, 0, ZoneOffset.UTC).toEpochSecond)
    actual.head.description should be("N/A")
    actual.head.testData should be(false)
    actual.head.streamingStatus should be(StreamingStatusType.FINISHED)
    actual.head.streamingModel should be(StreamingModelType.WATCH_AND_BET)
    actual.head.allowedCountries.size should be(0)
    actual.head.deniedCountries.size should be(0)
  }

  private def setClock(value: LocalDateTime): Unit =
    given(timeServiceMock.getCurrentTime).willReturn(value)

}
