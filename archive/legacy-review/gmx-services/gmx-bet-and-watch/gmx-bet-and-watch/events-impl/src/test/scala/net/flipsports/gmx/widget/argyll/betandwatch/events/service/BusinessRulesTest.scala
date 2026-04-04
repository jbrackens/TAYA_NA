package net.flipsports.gmx.widget.argyll.betandwatch.events.service

import java.time.ZonedDateTime

import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType.WATCH_AND_BET
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception.{InvalidUserCountryException, NoQualifyingBetException}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto.InBetSelection
import org.junit.runner.RunWith
import org.mockito.BDDMockito.given
import org.mockito.Mockito
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.{BeforeAndAfterEach, FunSuite}
import test.shared.{InternalObjectSupport, SBTechObjectSupport}

@RunWith(classOf[JUnitRunner])
class BusinessRulesTest extends FunSuite with MockitoSugar with BeforeAndAfterEach
  with InternalObjectSupport with SBTechObjectSupport {

  private val configMock = mock[Config]
  private var objectUnderTest: BusinessRules = _

  private val now: ZonedDateTime = ZonedDateTime.now()

  override protected def beforeEach(): Unit =
    initDefaults()

  private def initDefaults(): Unit = {
    Mockito.reset(configMock)

    configureMinStake(0)
    configureVerifyBets(true)
    constructSubject()
  }

  private def constructSubject(): Unit =
    objectUnderTest = new SampleService(configMock)

  private def configureVerifyBets(value: Boolean): Unit =
    given(configMock.getBoolean("app.business-rules.verify-bets")).willReturn(value)

  private def configureMinStake(value: Double): Unit =
    given(configMock.getDouble("app.business-rules.min-stake")).willReturn(value)

  test("'verifyCountry()' should SUCCEED for ALLOWED country") {
    // given
    val user = sampleUser.copy(countyCode = "US")
    val event = sampleEvent.copy(allowedCountries = Seq("US", "CA"))

    // when
    val actual = objectUnderTest.verifyCountry(user, event)

    // then
    actual should be(true)
  }

  test("'verifyCountry()' should FAIL for NOT ALLOWED country") {
    // given
    val user = sampleUser.copy(countyCode = "US")
    val event = sampleEvent.copy(allowedCountries = Seq("GB", "CA"))

    // when
    intercept[InvalidUserCountryException] {
      objectUnderTest.verifyCountry(user, event)
    }

    // then
  }

  test("'verifyCountry()' should SUCCEED for NOT DENIED country") {
    // given
    val user = sampleUser.copy(countyCode = "GB")
    val event = sampleEvent.copy(deniedCountries = Seq("US", "CA"))

    // when
    val actual = objectUnderTest.verifyCountry(user, event)

    // then
    actual should be(true)
  }

  test("'verifyCountry()' should FAIL for DENIED country") {
    // given
    val user = sampleUser.copy(countyCode = "PL")
    val event = sampleEvent.copy(deniedCountries = Seq("PL", "DE"))

    // when
    intercept[InvalidUserCountryException] {
      objectUnderTest.verifyCountry(user, event)
    }

    // then
  }

  test("'verifyBets()' should SUCCEED when bet for event higher than configured") {
    // given
    val user = sampleUser
    val event = sampleEvent.copy(id = "405495")
    val bets = List(InBetSelection(sampleBet.copy(stake = 100d), sampleSelection.copy(gameId = 405495))(now))
    configureMinStake(10d)
    constructSubject()

    // when
    val actual = objectUnderTest.verifyBets(user, event, bets)

    // then
    actual should be(true)
  }

  test("'verifyBets()' should SUCCEED when aggregated bets higher than configured") {
    // given
    val user = sampleUser
    val event = sampleEvent.copy(id = "405495")
    val bets = List(InBetSelection(sampleBet.copy(stake = 8d), sampleSelection.copy(gameId = 405495))(now),
      InBetSelection(sampleBet.copy(stake = 6d), sampleSelection.copy(gameId = 405495))(now))
    configureMinStake(10d)
    constructSubject()

    // when
    val actual = objectUnderTest.verifyBets(user, event, bets)

    // then
    actual should be(true)
  }

  test("'verifyBets()' should FAIL when bet for event smaller than configured") {
    // given
    val user = sampleUser
    val event = sampleEvent.copy(id = "405495")
    val bets = List(InBetSelection(sampleBet.copy(stake = 5d), sampleSelection.copy(gameId = 405495))(now))
    configureMinStake(10d)
    constructSubject()

    // when
    intercept[NoQualifyingBetException] {
      objectUnderTest.verifyBets(user, event, bets)
    }

    // then
  }

  test("'verifyBets()' should FAIL when no bet for event found") {
    // given
    val user = sampleUser
    val event = sampleEvent.copy(id = "405495")
    val bets = List()
    configureMinStake(10d)
    constructSubject()

    // when
    intercept[NoQualifyingBetException] {
      objectUnderTest.verifyBets(user, event, bets)
    }

    // then
  }

  test("'verifyBets()' should SUCCEED for test event") {
    // given
    val user = sampleUser
    val event = sampleEvent.copy(testData = true)
    val bets = List()
    configureMinStake(100D)
    constructSubject()

    // when
    val actual = objectUnderTest.verifyBets(user, event, bets)

    // then
    actual should be(true)
  }

  test("'verifyBets()' should SUCCEED for WATCH_AND_BET model") {
    // given
    val user = sampleUser
    val event = sampleEvent.copy(streamingModel = WATCH_AND_BET)
    val bets = List()
    configureMinStake(100D)
    constructSubject()

    // when
    val actual = objectUnderTest.verifyBets(user, event, bets)

    // then
    actual should be(true)
  }

  test("'verifyBets()' should SUCCEED when verification disabled") {
    // given
    val user = sampleUser
    val event = sampleEvent.copy(id = "405495")
    val bets = List()
    configureMinStake(10d)
    configureVerifyBets(false)
    constructSubject()

    // when
    val actual = objectUnderTest.verifyBets(user, event, bets)

    // then
    actual should be(true)
  }

  class SampleService(val config: Config) extends BusinessRules {
    override def getConfig: Config = config
  }

}
