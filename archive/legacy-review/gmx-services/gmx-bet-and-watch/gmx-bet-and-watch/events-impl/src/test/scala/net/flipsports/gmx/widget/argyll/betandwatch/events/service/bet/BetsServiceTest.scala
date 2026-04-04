package net.flipsports.gmx.widget.argyll.betandwatch.events.service.bet

import java.time.ZonedDateTime

import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto._
import org.junit.runner.RunWith
import org.mockito.BDDMockito.given
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.{BeforeAndAfterEach, FunSuite}
import test.shared.SBTechObjectSupport

import scala.concurrent.Await
import scala.concurrent.duration.Duration


@RunWith(classOf[JUnitRunner])
class BetsServiceTest extends FunSuite with MockitoSugar
  with SBTechObjectSupport with BeforeAndAfterEach {

  private val sbtechBetsCacheMock: SBTechBetsCache = mock[SBTechBetsCache]

  private val objectUnderTest: BetsService = new BetsService(sbtechBetsCacheMock, new BetsConfig(false, Duration.Zero))

  private val now = ZonedDateTime.now()

  test("'loadData()' should cache bets by user") {
    // given
    setBets(Seq(
      InBetSelection(sampleBet.copy(customerId = 1), sampleSelection.copy(gameId = 1))(now),
      InBetSelection(sampleBet.copy(customerId = 1), sampleSelection.copy(gameId = 2))(now),
      InBetSelection(sampleBet.copy(customerId = 2), sampleSelection.copy(gameId = 1))(now),
      InBetSelection(sampleBet.copy(customerId = 2), sampleSelection.copy(gameId = 1))(now),
      InBetSelection(sampleBet.copy(customerId = 3), sampleSelection.copy(gameId = 2))(now),
      InBetSelection(sampleBet.copy(customerId = 4), sampleSelection.copy(gameId = 3))(now),
      InBetSelection(sampleBet.copy(customerId = 5), sampleSelection.copy(gameId = 4))(now),
    ))

    // when
    objectUnderTest.runScheduled()

    // then
    val mapping = Await.result(objectUnderTest.getMapping, Duration.Zero)
    mapping should have size 5
    mapping(1)(1) should have size 1
    mapping(1)(2) should have size 1
    mapping(2)(1) should have size 2
    mapping(3)(2) should have size 1
    mapping(4)(3) should have size 1

    intercept[NoSuchElementException] {
      mapping(1)(3)
    }
    intercept[NoSuchElementException] {
      mapping(5)(1)
    }
  }

  private def setBets(seq: Seq[InBetSelection]): Unit =
    given(sbtechBetsCacheMock.getBets).willReturn(seq)

}
