package net.flipsports.gmx.widget.argyll.betandwatch.events.service.bet

import java.time._
import java.util.concurrent.{TimeUnit, TimeoutException}

import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech._
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto._
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers._
import org.mockito.BDDMockito._
import org.mockito.Mockito.times
import org.mockito.{ArgumentMatchers, Mockito}
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.{BeforeAndAfterEach, FunSuite}
import test.shared.SBTechObjectSupport

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.{Await, Future}

@RunWith(classOf[JUnitRunner])
class SBTechBetsCacheTest extends FunSuite with MockitoSugar
  with SBTechObjectSupport with BeforeAndAfterEach {

  private val sbtechService: SBTechService = mock[SBTechService]
  private val configMock: Config = mock[Config]
  private val timeMock: TimeService = mock[TimeService]

  private var objectUnderTest: SBTechBetsCache = _

  private val now: ZonedDateTime = ZonedDateTime.now()

  override protected def beforeEach(): Unit =
    initDefaults()

  private def initDefaults(): Unit = {
    Mockito.reset()

    setClock(now.toLocalDateTime)
    setCacheInterval(Duration.ofMinutes(10))
    setCacheDaysBefore(0)
    setCacheLoadSegmentSize(Duration.ofMinutes(10))
    setCacheLoadSegmentOverlap(Duration.ofMinutes(10))

    setBets(List())

    constructSubject()
  }

  private def constructSubject(): Unit =
    objectUnderTest = new SBTechBetsCache(sbtechService, SBTechBetsCacheConfig.load(configMock), timeMock)(global)

  test("'refreshData()' should load races using configuration") {
    // given
    setClock(LocalDateTime.parse("2019-01-05T19:45:06"))
    setCacheDaysBefore(10)
    setCacheLoadSegmentSize(Duration.ofHours(6))
    setCacheLoadSegmentOverlap(Duration.ofMinutes(15))
    constructSubject()

    // when
    completeFuture(objectUnderTest.runScheduled())

    // then
    `then`(sbtechService).should(times(1))
      .getUserHorseRacingBets(eqTime("2018-12-25T23:45:00"), eqTime("2018-12-26T05:45:00"))(any())

    `then`(sbtechService).shouldHaveNoMoreInteractions()
  }

  test("'refreshData()' should terminate in specified interval") {
    // given
    given(sbtechService.getUserHorseRacingBets(any(), any())(any()))
      .willAnswer(_ => Future {
        Thread.sleep(200)
        throw new UnsupportedOperationException
      })
    setCacheInterval(Duration.ofMillis(100))
    constructSubject()

    // when
    intercept[TimeoutException] {
      completeFuture(objectUnderTest.runScheduled())
    }

    // then
  }

  test("'refreshData()' should handle API failures") {
    // given
    val givenSelection = sampleSelection

    given(sbtechService.getUserHorseRacingBets(any(), any())(any()))
      .willReturn(Future(List(
        InBetSelection(sampleBet.copy(stake = 10), givenSelection)(now))
      ))
      .willAnswer(_ => Future {
        throw new ExternalCallException("request timeout")
      })
      .willReturn(Future(List(
        InBetSelection(sampleBet.copy(stake = 100), givenSelection)(now))
      ))
    constructSubject()

    // when
    1 to 3 foreach { _ => completeFuture(objectUnderTest.runScheduled()) }

    // then
    val actual = objectUnderTest.getBets

    actual should have size 2
  }

  test("'refreshData()' should group bets based on event date and remove old events") {
    // given
    setCacheDaysBefore(5)
    val givenBet = sampleBet
    val givenSelection = sampleSelection

    given(sbtechService.getUserHorseRacingBets(any(), any())(any()))
      .willReturn(Future(List(
        InBetSelection(givenBet.copy(purchaseID = "0"), givenSelection)(now),
        InBetSelection(givenBet.copy(purchaseID = "1"), givenSelection)(now),
        InBetSelection(givenBet.copy(purchaseID = "2"), givenSelection.copy(eventDate = now.minusDays(1)))(now),
        InBetSelection(givenBet.copy(purchaseID = "3"), givenSelection.copy(eventDate = now.minusDays(5)))(now),
        InBetSelection(givenBet.copy(purchaseID = "4"), givenSelection.copy(eventDate = now.minusDays(7)))(now),
        InBetSelection(givenBet.copy(purchaseID = "5"), givenSelection.copy(eventDate = now.minusDays(6)))(now),
        InBetSelection(givenBet.copy(purchaseID = "6"), givenSelection.copy(eventDate = now.minusDays(2)))(now),
        InBetSelection(givenBet.copy(purchaseID = "7"), givenSelection.copy(eventDate = now.minusDays(10)))(now),
        InBetSelection(givenBet.copy(purchaseID = "8"), givenSelection.copy(eventDate = now.minusDays(5)))(now),
        InBetSelection(givenBet.copy(purchaseID = "9"), givenSelection.copy(eventDate = now.minusDays(6)))(now),
      )))
    constructSubject()

    // when
    completeFuture(objectUnderTest.runScheduled())

    // then
    var actual = objectUnderTest.getBets
    actual = ordered(actual)

    actual should have size 6
    actual(0).bet.purchaseID should be("0")
    actual(1).bet.purchaseID should be("1")
    actual(2).bet.purchaseID should be("2")
    actual(3).bet.purchaseID should be("3")
    actual(4).bet.purchaseID should be("6")
    actual(5).bet.purchaseID should be("8")
  }


  test("'refreshData()' should deduplicate bets ignoring loadedAt - keep oldest") {
    // given
    val givenBet = sampleBet
    val givenSelection = sampleSelection

    val firstUpdate = InBetSelection(givenBet, givenSelection)(ZonedDateTime.now())
    val lastUpdate = InBetSelection(givenBet, givenSelection)(ZonedDateTime.now().plusMinutes(5))
    given(sbtechService.getUserHorseRacingBets(any(), any())(any()))
      .willReturn(Future(List(
        firstUpdate,
        InBetSelection(givenBet, givenSelection.copy(eventDate = now.plusDays(1)))(ZonedDateTime.now()),
        InBetSelection(givenBet, givenSelection.copy(eventDate = now, gameId = 12))(ZonedDateTime.now()),
        InBetSelection(givenBet, givenSelection.copy(eventDate = now, lineId = 12))(ZonedDateTime.now()),
        InBetSelection(givenBet, givenSelection.copy(eventDate = now, odds = 12))(ZonedDateTime.now()),
        InBetSelection(givenBet, givenSelection)(ZonedDateTime.now()),
      )))
      .willReturn(Future(List(
        InBetSelection(givenBet, givenSelection)(ZonedDateTime.now()),
        InBetSelection(givenBet.copy(purchaseID = "12"), givenSelection)(ZonedDateTime.now()),
        InBetSelection(givenBet.copy(customerId = 12), givenSelection)(ZonedDateTime.now()),
        InBetSelection(givenBet.copy(stake = 12), givenSelection)(ZonedDateTime.now()),
        InBetSelection(givenBet, givenSelection)(ZonedDateTime.now()),
      )))
      .willReturn(Future(List(
        InBetSelection(givenBet, givenSelection.copy(eventDate = now.plusDays(1)))(ZonedDateTime.now()),
        InBetSelection(givenBet, givenSelection.copy(eventDate = now, gameId = 12))(ZonedDateTime.now()),
        InBetSelection(givenBet, givenSelection.copy(eventDate = now, lineId = 12))(ZonedDateTime.now()),
        InBetSelection(givenBet, givenSelection.copy(eventDate = now, odds = 12))(ZonedDateTime.now()),
        InBetSelection(givenBet, givenSelection)(ZonedDateTime.now()),
        lastUpdate,
        InBetSelection(givenBet.copy(purchaseID = "12"), givenSelection)(ZonedDateTime.now()),
        InBetSelection(givenBet.copy(customerId = 12), givenSelection)(ZonedDateTime.now()),
        InBetSelection(givenBet.copy(stake = 12), givenSelection)(ZonedDateTime.now()),
      )))
    constructSubject()

    // when
    1 to 3 foreach { _ => completeFuture(objectUnderTest.runScheduled()) }

    // then
    val actual = objectUnderTest.getBets

    actual should have size 8
    actual.head should be(firstUpdate)
  }

  test("'refreshData()' should cover period with segments") {
    // given
    setClock(LocalDateTime.parse("2019-01-05T19:45:06"))
    setCacheDaysBefore(2)
    setCacheLoadSegmentSize(Duration.ofHours(9))
    setCacheLoadSegmentOverlap(Duration.ofHours(1))
    constructSubject()

    // when
    1 to 10 foreach { _ => completeFuture(objectUnderTest.runScheduled()) }

    // then
    val inOrder = Mockito.inOrder(sbtechService)
    `then`(sbtechService).should(inOrder, times(1))
      .getUserHorseRacingBets(eqTime("2019-01-02T23:00:00"), eqTime("2019-01-03T08:00:00"))(any())
    `then`(sbtechService).should(inOrder, times(1))
      .getUserHorseRacingBets(eqTime("2019-01-03T07:00:00"), eqTime("2019-01-03T16:00:00"))(any())
    `then`(sbtechService).should(inOrder, times(1))
      .getUserHorseRacingBets(eqTime("2019-01-03T15:00:00"), eqTime("2019-01-04T00:00:00"))(any())
    `then`(sbtechService).should(inOrder, times(1))
      .getUserHorseRacingBets(eqTime("2019-01-03T23:00:00"), eqTime("2019-01-04T08:00:00"))(any())
    `then`(sbtechService).should(inOrder, times(1))
      .getUserHorseRacingBets(eqTime("2019-01-04T07:00:00"), eqTime("2019-01-04T16:00:00"))(any())
    `then`(sbtechService).should(inOrder, times(1))
      .getUserHorseRacingBets(eqTime("2019-01-04T15:00:00"), eqTime("2019-01-05T00:00:00"))(any())
    `then`(sbtechService).should(inOrder, times(1))
      .getUserHorseRacingBets(eqTime("2019-01-04T23:00:00"), eqTime("2019-01-05T08:00:00"))(any())
    `then`(sbtechService).should(inOrder, times(1))
      .getUserHorseRacingBets(eqTime("2019-01-05T07:00:00"), eqTime("2019-01-05T16:00:00"))(any())
    `then`(sbtechService).should(inOrder, times(1))
      .getUserHorseRacingBets(eqTime("2019-01-05T15:00:00"), eqTime("2019-01-06T00:00:00"))(any())
    `then`(sbtechService).should(inOrder, times(1))
      .getUserHorseRacingBets(eqTime("2019-01-05T18:45:06"), eqTime("2019-01-06T03:45:06"))(any())
  }

  private def completeFuture(future: Future[Any]): Unit = {
    Await.result(future, scala.concurrent.duration.Duration(getCacheInterval().toMillis, TimeUnit.MILLISECONDS))
  }

  private def eqTime(timeString: String) = {
    ArgumentMatchers.eq(LocalDateTime.parse(timeString))
  }

  private def ordered(actual: Seq[InBetSelection]) = {
    actual
      .sortBy(b => (b.bet.purchaseID, b.selection.eventDate.toEpochSecond))
  }

  private def setCacheInterval(value: Duration): Unit =
    given(configMock.getDuration("app.user-bets.sbtech-cache.interval")).willReturn(value)


  private def getCacheInterval(): Duration =
    configMock.getDuration("app.user-bets.sbtech-cache.interval")

  private def setCacheDaysBefore(value: Int): Unit =
    given(configMock.getInt("app.user-bets.sbtech-cache.days-before")).willReturn(value)

  private def setCacheLoadSegmentSize(value: Duration): Unit =
    given(configMock.getDuration("app.user-bets.sbtech-cache.segment-size")).willReturn(value)

  private def setCacheLoadSegmentOverlap(value: Duration): Unit =
    given(configMock.getDuration("app.user-bets.sbtech-cache.segment-overlap")).willReturn(value)

  private def setClock(value: LocalDateTime): Unit =
    given(timeMock.getCurrentTime).willReturn(value)

  private def setBets(seq: List[InBetSelection]): Unit =
    given(sbtechService.getUserHorseRacingBets(any(), any())(any())).willReturn(Future(seq))

}
