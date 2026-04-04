package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event

import java.time.{Duration, LocalDateTime}

import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType.{BET_AND_WATCH, WATCH_AND_BET}
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ATR
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.ProviderEvent
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.atr.ATRStreamingProvider
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sbtech.SBTechEventsCache
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito.given
import org.mockito.Mockito
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.{BeforeAndAfterEach, FunSuite}
import test.shared.InternalObjectSupport

@RunWith(classOf[JUnitRunner])
class EventsLookupTest extends FunSuite with MockitoSugar
  with InternalObjectSupport with BeforeAndAfterEach {

  private val atrEventsLookupMock: ATRStreamingProvider = mock[ATRStreamingProvider]
  private val sbtechEventsCacheMock: SBTechEventsCache = mock[SBTechEventsCache]
  private val timeMock: TimeService = mock[TimeService]
  private val configMock: Config = mock[Config]

  private var objectUnderTest: EventsLookup = _

  override protected def beforeEach(): Unit =
    initDefaults()

  private def initDefaults(): Unit = {
    Mockito.reset()

    setEmptySBTechGames()
    setEmptyTestEvents()
    setClock(LocalDateTime.now())
    setIncludeTestData(true)
    setInterval(Duration.ZERO)

    constructSubject()
  }

  private def constructSubject(): Unit = {
    `given`(atrEventsLookupMock.provider).willReturn(ATR)
    `given`(atrEventsLookupMock.streamingModel(any())).willReturn(WATCH_AND_BET)

    objectUnderTest = new EventsLookup(sbtechEventsCacheMock, Set(atrEventsLookupMock), EventsLookupConfig.load(configMock), timeMock)
  }

  test("'refreshMapping()' should handle empty results") {
    // given

    // when
    objectUnderTest.runScheduled()

    // then
    val mapping = objectUnderTest.id2Event
    mapping should have size 0
  }

  test("'refreshMapping()' should skip test events when disabled") {
    // given
    setIncludeTestData(false)
    setTestEvents(Seq(sampleEvent))
    constructSubject()

    // when
    objectUnderTest.runScheduled()

    // then
    val mapping = objectUnderTest.id2Event
    mapping should have size 0
  }

  test("'refreshMapping()' should add test events when enabled") {
    // given
    val givenTestEvent = sampleEvent
    setTestEvents(Seq(givenTestEvent))
    constructSubject()

    // when
    objectUnderTest.runScheduled()

    // then
    val mapping = objectUnderTest.id2Event
    mapping should have size 1

    val foundEvent = objectUnderTest.getEvent(givenTestEvent.id.toLong)
    foundEvent.isDefined should be(true)

    val eventMapping = foundEvent.get
    eventMapping.event.id.toString should be(givenTestEvent.id)
    eventMapping.provider should be(ATR)
    eventMapping.streamingModel should be(BET_AND_WATCH)
    eventMapping.stream.isDefined should be(true)
    eventMapping.stream.get.streamingStatus should be(givenTestEvent.streamingStatus)
  }


  private def setIncludeTestData(value: Boolean): Unit =
    given(configMock.getBoolean("app.load-events.mapping.include-test-data")).willReturn(value)

  private def setInterval(value: Duration): Unit =
    given(configMock.getDuration("app.load-events.mapping.interval")).willReturn(value)

  private def setClock(value: LocalDateTime): Unit =
    given(timeMock.getCurrentTime).willReturn(value)

  private def setEmptySBTechGames(): Unit =
    given(sbtechEventsCacheMock.getEvents(any(), any())).willReturn(Seq())

  private def setEmptyTestEvents(): Unit =
    setTestEvents(Seq())

  private def setTestEvents(seq: Seq[ProviderEvent]): Unit =
    given(atrEventsLookupMock.loadTestEvents(any(), any())).willReturn(seq)
}
