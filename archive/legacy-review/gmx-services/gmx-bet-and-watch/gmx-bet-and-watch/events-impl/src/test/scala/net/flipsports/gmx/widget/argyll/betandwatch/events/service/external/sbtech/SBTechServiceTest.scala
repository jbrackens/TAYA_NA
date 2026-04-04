package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech

import java.time.LocalDateTime

import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto.InBetSelection
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito.given
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.{BeforeAndAfterAll, FunSuite}
import play.api.libs.json.Json

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future}

@RunWith(classOf[JUnitRunner])
class SBTechServiceTest extends FunSuite
  with MockitoSugar with BeforeAndAfterAll {

  private val oddsAPIClientMock = mock[OddsAPIClient]
  private val dataAPIClientMock = mock[DataAPIClient]

  private val objectUnderTest = new SBTechService(oddsAPIClientMock, dataAPIClientMock)

  override def beforeAll(): Unit = {
    given(oddsAPIClientMock.callMarkets(any()))
      .willReturn(Future.successful(
        Json.parse(getClass.getClassLoader.getResourceAsStream("mock/sbtech_odds_markets.json"))
      ))
    given(dataAPIClientMock.callPlayerDetails(any()))
      .willReturn(Future.successful(
        Json.parse(getClass.getClassLoader.getResourceAsStream("mock/sbtech_data_playerdetails.json"))
      ))
    given(dataAPIClientMock.callOpenBets(any(), any()))
      .willReturn(Future.successful(
        Json.parse(getClass.getClassLoader.getResourceAsStream("external/sbtech/sbtech_data_openbets_mixed.json"))
      ))
  }


  test("'getAvailableEvents()' should parse JSON") {
    // given

    // when
    val eventualActual = objectUnderTest.getAvailableEvents(LocalDateTime.now())
    val actual = Await.result(eventualActual, Duration.Inf)

    // then
    actual should have size 278
  }


  test("'getUserDetails()' should parse JSON") {
    // given

    // when
    val eventualActual = objectUnderTest.getUserDetails("")
    val actual = Await.result(eventualActual, Duration.Inf)

    // then
    actual.id should be(16825817)
    actual.userName should be("sebflip")
    actual.fullName should be("Sebastian Flip")
    actual.countyCode should be("GB")
  }

  test("'getUserBets()' should filter horse racing") {
    // given
    val currentTime = LocalDateTime.now()

    // when
    val eventualActual = objectUnderTest.getUserHorseRacingBets(LocalDateTime.now(), LocalDateTime.now())(currentTime)
    var actual = Await.result(eventualActual, Duration.Inf)

    // then
    actual should have size 5
    actual = ordered(actual)

    actual(0).bet.purchaseID should be("637146127135734584")
    actual(0).bet.stake should be(0.5000)
    actual(0).bet.customerId should be(12691102)
    actual(0).bet.creationDate.toString should be("2020-01-14T15:31:53.460Z[UTC]")
    actual(0).selection.gameId should be(70535423)
    actual(0).selection.lineId should be(821512061)
    actual(0).selection.odds should be(0)
    actual(0).selection.typeName should be("Winner")
    actual(0).loadedAt.toLocalDateTime should be(currentTime)

    actual(1).bet.purchaseID should be("637146127135734584")
    actual(1).bet.stake should be(0.5000)
    actual(1).bet.customerId should be(12691102)
    actual(1).bet.creationDate.toString should be("2020-01-14T15:31:53.460Z[UTC]")
    actual(1).selection.gameId should be(70535423)
    actual(1).selection.lineId should be(821512065)
    actual(1).selection.odds should be(0)
    actual(1).selection.typeName should be(" (EW 1/4 1-2)")
    actual(1).loadedAt.toLocalDateTime should be(currentTime)

    actual(2).bet.purchaseID should be("637157451488073844")
    actual(2).bet.stake should be(2.5)
    actual(2).bet.customerId should be(23456506)
    actual(2).bet.creationDate.toString should be("2020-01-27T18:05:48.543Z[UTC]")
    actual(2).selection.gameId should be(71077162)
    actual(2).selection.lineId should be(827508838)
    actual(2).selection.odds should be(3300)
    actual(2).selection.typeName should be("Winner")
    actual(2).loadedAt.toLocalDateTime should be(currentTime)

    actual(3).bet.purchaseID should be("637157451488073844")
    actual(3).bet.stake should be(2.5)
    actual(3).bet.customerId should be(23456506)
    actual(3).bet.creationDate.toString should be("2020-01-27T18:05:48.543Z[UTC]")
    actual(3).selection.gameId should be(71077162)
    actual(3).selection.lineId should be(827508842)
    actual(3).selection.odds should be(825)
    actual(3).selection.typeName should be(" (EW 1/4 1-2)")
    actual(3).loadedAt.toLocalDateTime should be(currentTime)

    actual(4).bet.purchaseID should be("637157458467398921")
    actual(4).bet.stake should be(68.0)
    actual(4).bet.customerId should be(19535350)
    actual(4).bet.creationDate.toString should be("2020-01-27T18:17:25.980Z[UTC]")
    actual(4).selection.gameId should be(71077117)
    actual(4).selection.lineId should be(827508566)
    actual(4).selection.odds should be(110)
    actual(4).selection.typeName should be("Winner")
    actual(4).loadedAt.toLocalDateTime should be(currentTime)
  }

  private def ordered(actual: Seq[InBetSelection]) = {
    actual
      .sortBy(b => (b.bet.purchaseID, b.selection.gameId))
  }
}