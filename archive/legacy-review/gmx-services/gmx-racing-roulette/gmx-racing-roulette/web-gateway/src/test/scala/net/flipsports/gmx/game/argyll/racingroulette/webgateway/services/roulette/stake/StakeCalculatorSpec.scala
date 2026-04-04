package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.stake

import akka.actor.ActorSystem
import akka.event.{Logging, LoggingAdapter}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.Participant
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.SelectionStatus
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.SelectionStatus.{Active, Disabled, NonRunner}
import org.junit.runner.RunWith
import org.scalatest.concurrent.Futures
import org.scalatest.junit.JUnitRunner
import org.scalatest.{FunSuite, Matchers}

@RunWith(classOf[JUnitRunner])
class StakeCalculatorSpec extends FunSuite with Futures with Matchers {

  private val objectUnderTest = StakeCalculatorTest

  test("'distributeStake()' SHOULD calculate stake and return based on input") {
    // given
    val calculatorTestCase = CalculatorTestCase.fromCSV("stake_input.csv")

    // when
    val actualTry = objectUnderTest.distributeStake(calculatorTestCase.aggregated.stake, calculatorTestCase.lines.map(line => createParticipant(line.id, line.odds, line.status.get)))

    // then
    val actual = actualTry.get
    actual.potentialReturn should be(calculatorTestCase.aggregated.potentialReturn)
    checkTotalStakeDistribution(calculatorTestCase.aggregated.stake, actual.selections)

    actual.selections should have size calculatorTestCase.lines.size
    val expectedLinesSorted = calculatorTestCase.lines.sortBy(_.id)
    val actualLinesSorted = actual.selections.sortBy(_.participant.id)

    expectedLinesSorted.zip(actualLinesSorted).foreach(pair => compareLines(pair._1, pair._2))
  }

  test("'distributeStake()' SHOULD distribute remaining stake") {
    // given
    val givenStake = 0.50
    val givenSelections = Seq(
      createParticipant("1", 4.00, Active),
      createParticipant("2", 4.00, Active),
      createParticipant("3", 2.00, Active),
    )

    // when
    val actualTry = objectUnderTest.distributeStake(givenStake, givenSelections)

    // then
    val actual = actualTry.get
    checkTotalStakeDistribution(givenStake, actual.selections)

    actual.selections.size should be(3)
    actual.selections(0).singleStake should be(0.24)
    actual.selections(1).singleStake should be(0.13)
    actual.selections(2).singleStake should be(0.13)
  }

  test("'distributeStake()' SHOULD skip NonRunner") {
    // given
    val givenStake = 0.50
    val givenSelections = Seq(
      createParticipant("1", 4.00, Active),
      createParticipant("2", 4.00, Active),
      createParticipant("3", 2.00, NonRunner),
    )

    // when
    val actualTry = objectUnderTest.distributeStake(givenStake, givenSelections)

    // then
    val actual = actualTry.get
    checkTotalStakeDistribution(givenStake, actual.selections)

    actual.selections.size should be(2)
    actual.selections(0).singleStake should be(0.25)
    actual.selections(1).singleStake should be(0.25)
  }

  test("'distributeStake()' SHOULD return empty when no Active selections") {
    // given
    val givenStake = 0.50
    val givenSelections = Seq(
      createParticipant("1", 4.00, Disabled),
      createParticipant("2", 2.00, NonRunner),
    )

    // when
    val actualTry = objectUnderTest.distributeStake(givenStake, givenSelections)

    // then
    val actual = actualTry.get

    actual.selections.size should be(0)
    actual.potentialReturn should be(0)
  }

  test("'distributeStake()' SHOULD increase to minimum stake") {
    // given
    val givenStake = 0.50
    val givenSelections = Seq(
      createParticipant("1", 1.00, Active),
      createParticipant("3", 200.00, Active),
    )

    // when
    val actualTry = objectUnderTest.distributeStake(givenStake, givenSelections)

    // then
    val actual = actualTry.get
    checkTotalStakeDistribution(givenStake, actual.selections)

    actual.selections.size should be(2)
    actual.selections(0).singleStake should be(0.45)
    actual.selections(1).singleStake should be(0.05)
  }

  test("'distributeStake()' SHOULD truncate potential return") {
    // given
    val givenStake = 0.86
    val givenSelections = Seq(
      createParticipant("1", 2.38, Active)
    )

    // when
    val actualTry = objectUnderTest.distributeStake(givenStake, givenSelections)

    // then
    val actual = actualTry.get
    checkTotalStakeDistribution(givenStake, actual.selections)

    actual.selections.size should be(1)
    actual.selections(0).singleStake should be(0.86)
    actual.selections(0).singleReturn should be(2.04)
    actual.potentialReturn should be(2.04)
  }

  private val notUsedPosition = -1
  private val notUsedOdds = "/"

  private def createParticipant(id: String, trueOdds: Double, status: SelectionStatus) = {
    Participant(id, notUsedPosition, notUsedOdds, trueOdds, status)
  }

  private def checkTotalStakeDistribution(stake: Double, selections: Seq[SelectionStake]): Unit = {
    val sum = selections.map(_.singleStake).sum
    roundTwo(sum) should be(stake)
  }

  private def roundTwo(in: Double): Double = {
    BigDecimal(in).setScale(2, BigDecimal.RoundingMode.HALF_DOWN).toDouble
  }

  private def compareLines(expected: StakeLine, actual: SelectionStake): Unit = {
    actual.participant.id should be(expected.id)
    actual.singleStake should be(expected.stake)
    actual.singleReturn should be(expected.potentialReturn)
  }
}

object StakeCalculatorTest extends StakeCalculator {
  val system = ActorSystem("StakeCalculatorSpec")
  val logger: LoggingAdapter = Logging(system, this.getClass)
}