package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.handler

import java.time.ZonedDateTime

import akka.actor.ActorSystem
import akka.event.{Logging, LoggingAdapter}
import net.flipsports.gmx.common.webapi.ExternalCallException
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Assertions.{checkFailedMetadata, checkSuccessMetadata}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Factory.samplePlaceBetsRequest
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.RequestMetadata
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request.{PlaceBetsReq, UserChip}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.{ErrorDetails, FailureResp, Participant, PlaceBetsResp}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.{ErrorCode, Operation, SelectionStatus}
import net.flipsports.gmx.webapiclient.sbtech.betting.BettingAPIClient
import net.flipsports.gmx.webapiclient.sbtech.betting.dto._
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito.{`given`, `then`}
import org.mockito.{ArgumentCaptor, ArgumentMatchers, Mockito}
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.prop.TableDrivenPropertyChecks
import org.scalatest.{BeforeAndAfter, FunSuite, Matchers}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

@RunWith(classOf[JUnitRunner])
class PlaceBetsHandlerSpec extends FunSuite
  with TableDrivenPropertyChecks
  with ScalaFutures
  with Matchers
  with MockitoSugar
  with BeforeAndAfter {

  private val system = ActorSystem("PlaceBetsHandlerSpec")
  private val loggingAdapter: LoggingAdapter = Logging(system, this.getClass)

  private val bettingAPIClientMock: BettingAPIClient = mock[BettingAPIClient]
  private val objectUnderTest = new PlaceBetsHandler {
    override def bettingAPIClient: BettingAPIClient = bettingAPIClientMock

    override def logger: LoggingAdapter = loggingAdapter
  }

  before {
    Mockito.reset(bettingAPIClientMock)
  }

  test("'handlePlaceBet()' SHOULD call bettingAPI once") {
    // given
    given(bettingAPIClientMock.callPlaceBets(any(), any())).willReturn(Future(Right(PlaceBetsResponse("637147790026333664", ZonedDateTime.now(), "Open"))))

    val givenRequest = PlaceBetsReq(RequestMetadata(Some("Req1"), Operation.PlaceBets, "123"), "JWT", Seq(
      UserChip("1-2", 4, Seq(
        Participant("id1", 1, "4/1", 5.0, SelectionStatus.Active),
        Participant("id2", 2, "2/1", 3.0, SelectionStatus.Active)
      )),
      UserChip("R2", 2, Seq(
        Participant("id2", 2, "2/1", 3.0, SelectionStatus.Active),
        Participant("id4", 4, "9/2", 5.5, SelectionStatus.Active)
      )),
      UserChip("1", 1, Seq(
        Participant("id1", 1, "4/1", 5.0, SelectionStatus.Active)
      )),
    ))

    // when
    val eventualResponse = objectUnderTest.handlePlaceBet(givenRequest)

    // then
    whenReady(eventualResponse) { response => {
      response shouldBe a[PlaceBetsResp]
      val betsResponse = response.asInstanceOf[PlaceBetsResp]
      checkSuccessMetadata(givenRequest, betsResponse)

      betsResponse.result should be("637147790026333664")

      val bettingAPIRequestCaptor: ArgumentCaptor[PlaceBetsRequest] = ArgumentCaptor.forClass(classOf[PlaceBetsRequest])
      `then`(bettingAPIClientMock).should(Mockito.times(1)).callPlaceBets(ArgumentMatchers.eq(givenRequest.userJWT), bettingAPIRequestCaptor.capture())

      val bettingAPIRequest = bettingAPIRequestCaptor.getValue
      bettingAPIRequest.selections should have size (3)

      bettingAPIRequest.selections(0).id should be("id1")
      bettingAPIRequest.selections(0).trueOdds should be(5.0)
      bettingAPIRequest.selections(0).displayOdds should be("4/1")
      bettingAPIRequest.selections(1).id should be("id2")
      bettingAPIRequest.selections(1).trueOdds should be(3.0)
      bettingAPIRequest.selections(1).displayOdds should be("2/1")
      bettingAPIRequest.selections(2).id should be("id4")
      bettingAPIRequest.selections(2).trueOdds should be(5.5)
      bettingAPIRequest.selections(2).displayOdds should be("9/2")

      bettingAPIRequest.bets should have size (3)
      bettingAPIRequest.bets(0).selectionsMapped should have size (1)
      bettingAPIRequest.bets(0).selectionsMapped.head.id should be("id1")
      bettingAPIRequest.bets(0).trueOdds should be(5.0)
      bettingAPIRequest.bets(0).displayOdds should be("4/1")
      bettingAPIRequest.bets(0).stake should be(1.5 + 1.0)
      bettingAPIRequest.bets(0).potentialReturns should be(12.5)
      bettingAPIRequest.bets(1).selectionsMapped should have size (1)
      bettingAPIRequest.bets(1).selectionsMapped.head.id should be("id2")
      bettingAPIRequest.bets(1).trueOdds should be(3.0)
      bettingAPIRequest.bets(1).displayOdds should be("2/1")
      bettingAPIRequest.bets(1).stake should be(2.5 + 1.29)
      bettingAPIRequest.bets(1).potentialReturns should be(11.37)
      bettingAPIRequest.bets(2).selectionsMapped should have size (1)
      bettingAPIRequest.bets(2).selectionsMapped.head.id should be("id4")
      bettingAPIRequest.bets(2).trueOdds should be(5.5)
      bettingAPIRequest.bets(2).displayOdds should be("9/2")
      bettingAPIRequest.bets(2).stake should be(0.71)
      bettingAPIRequest.bets(2).potentialReturns should be(3.9)
    }
    }
  }

  test("'handlePlaceBet()' SHOULD skip selections when not active") {
    // given
    given(bettingAPIClientMock.callPlaceBets(any(), any())).willReturn(Future(Right(PlaceBetsResponse("637147790026333664", ZonedDateTime.now(), "Open"))))

    val givenRequest = PlaceBetsReq(RequestMetadata(Some("Req1"), Operation.PlaceBets, "123"), "JWT", Seq(
      UserChip("1-2", 4, Seq(
        Participant("id1", 1, "4/1", 5.0, SelectionStatus.Active),
        Participant("id2", 2, "2/1", 3.0, SelectionStatus.Active)
      )),
      UserChip("R2", 2, Seq(
        Participant("id2", 2, "2/1", 3.0, SelectionStatus.Active),
        Participant("id4", 4, "9/2", 5.5, SelectionStatus.Disabled)
      )),
      UserChip("1", 1, Seq(
        Participant("id1", 1, "4/1", 5.0, SelectionStatus.NonRunner)
      )),
    ))

    // when
    val eventualResponse = objectUnderTest.handlePlaceBet(givenRequest)

    // then
    whenReady(eventualResponse) { response => {
      response shouldBe a[PlaceBetsResp]
      val betsResponse = response.asInstanceOf[PlaceBetsResp]
      checkSuccessMetadata(givenRequest, betsResponse)

      betsResponse.result should be("637147790026333664")

      val bettingAPIRequestCaptor: ArgumentCaptor[PlaceBetsRequest] = ArgumentCaptor.forClass(classOf[PlaceBetsRequest])
      `then`(bettingAPIClientMock).should(Mockito.times(1)).callPlaceBets(ArgumentMatchers.eq(givenRequest.userJWT), bettingAPIRequestCaptor.capture())

      val bettingAPIRequest = bettingAPIRequestCaptor.getValue
      bettingAPIRequest.selections should have size (2)

      bettingAPIRequest.selections(0).id should be("id1")
      bettingAPIRequest.selections(0).trueOdds should be(5.0)
      bettingAPIRequest.selections(0).displayOdds should be("4/1")
      bettingAPIRequest.selections(1).id should be("id2")
      bettingAPIRequest.selections(1).trueOdds should be(3.0)
      bettingAPIRequest.selections(1).displayOdds should be("2/1")

      bettingAPIRequest.bets should have size (2)
      bettingAPIRequest.bets(0).selectionsMapped should have size (1)
      bettingAPIRequest.bets(0).selectionsMapped.head.id should be("id1")
      bettingAPIRequest.bets(0).trueOdds should be(5.0)
      bettingAPIRequest.bets(0).displayOdds should be("4/1")
      bettingAPIRequest.bets(0).stake should be(1.5)
      bettingAPIRequest.bets(0).potentialReturns should be(7.5)
      bettingAPIRequest.bets(1).selectionsMapped should have size (1)
      bettingAPIRequest.bets(1).selectionsMapped.head.id should be("id2")
      bettingAPIRequest.bets(1).trueOdds should be(3.0)
      bettingAPIRequest.bets(1).displayOdds should be("2/1")
      bettingAPIRequest.bets(1).stake should be(2.5 + 2)
      bettingAPIRequest.bets(1).potentialReturns should be(13.5)
    }
    }
  }

  test("'handlePlaceBet()' SHOULD fail when bettingAPI error") {
    // given
    given(bettingAPIClientMock.callPlaceBets(any(), any())).willReturn(Future.failed(new ExternalCallException("Missing or invalid JWT token")))

    val givenRequest = samplePlaceBetsRequest

    // when
    val eventualResponse = objectUnderTest.handlePlaceBet(givenRequest)

    // then
    whenReady(eventualResponse) { response => {
      response shouldBe a[FailureResp]
      val failed = response.asInstanceOf[FailureResp]
      checkFailedMetadata(givenRequest, failed)

      failed.error.code should be(ErrorCode.Unexpected)
      failed.error.message should be("Your bet could not be placed.")
      failed.error.description should be("Please try again.")
      failed.cause should be(Array("Missing or invalid JWT token"))
    }
    }
  }

  test("'handlePlaceBet()' SHOULD fail when business error") {
    forAll(businessErrors) { (givenResponse: PlaceBetsError, expectedError: ErrorDetails,  expectedCause: Array[String]) =>
      // given
      given(bettingAPIClientMock.callPlaceBets(any(), any())).willReturn(Future.successful(Left(givenResponse)))

      val givenRequest = samplePlaceBetsRequest

      // when
      val eventualResponse = objectUnderTest.handlePlaceBet(givenRequest)

      // then
      whenReady(eventualResponse) { response => {
        response shouldBe a[FailureResp]
        val failed = response.asInstanceOf[FailureResp]
        checkFailedMetadata(givenRequest, failed)

        failed.error.code should be(expectedError.code)
        failed.error.message should be(expectedError.message)
        failed.error.description should be(expectedError.description)
        failed.cause should be(expectedCause)
      }
      }
    }
  }

  private lazy val businessErrors =
    Table(
      ("givenResponse", "expectedError", "expectedCause"),
      (
        PlaceBetsError("InvalidSelection", "Validation failed: 0QA64618199#755522967_22L197219Q1361021Q2-1 is not valid", None),
        ErrorDetails(ErrorCode.BetRejectedRaceOff, "Your bet could not be placed.", "The race has already started."),
        Array("Validation failed: 0QA64618199#755522967_22L197219Q1361021Q2-1 is not valid")
      ),
      (
        PlaceBetsError("OddsNotMatch", "Bet Odds have changed.", None),
        ErrorDetails(ErrorCode.BetRejectedOddsChanged, "Your bet could not be placed.", "The odds of your selections has changed."),
        Array("Bet Odds have changed.")
      ),
      (
        PlaceBetsError("PurchaseNotAccepted", "PurchaseNotAccepted",
          Some(PlaceBetsErrorDetails(None, None, None, Seq(DeclinedBet(Seq(DeclineReason("OddsNotMatch", "The posted odds for the selection do not match the actual values", None))))))),
        ErrorDetails(ErrorCode.BetRejectedOddsChanged, "Your bet could not be placed.", "The odds of your selections has changed."),
        Array("The posted odds for the selection do not match the actual values")
      ),
      (
        PlaceBetsError("ValidationError", "Missing or invalid PotentialReturns on bet", None),
        ErrorDetails(ErrorCode.Unexpected, "Your bet could not be placed.", "Please try again."),
        Array("Missing or invalid PotentialReturns on bet")
      ),
      (
        PlaceBetsError("InternalServerError", "InternalServerError", None),
        ErrorDetails(ErrorCode.Unexpected, "Your bet could not be placed.", "Please try again."),
        Array("InternalServerError")
      ),
      (
        PlaceBetsError("OddsValidationError", "Odds cannot be validated due to a technical error.", None),
        ErrorDetails(ErrorCode.Unexpected, "Your bet could not be placed.", "Please try again."),
        Array("Odds cannot be validated due to a technical error.")
      ),
      (
        PlaceBetsError("ServiceNotAvailable", "Service not available.", None),
        ErrorDetails(ErrorCode.Unexpected, "Your bet could not be placed.", "Please try again."),
        Array("Service not available.")
      ),

      (
        PlaceBetsError("PurchaseNotAccepted", "PurchaseNotAccepted",
          Some(PlaceBetsErrorDetails(None, None, None, Seq(DeclinedBet(Seq(DeclineReason("CustomerLimitsError", "Deposit amount is too low", None))))))),
        ErrorDetails(ErrorCode.Unexpected, "Your bet could not be placed.", "Please try again."),
        Array("Deposit amount is too low")
      ),
      (
        PlaceBetsError("PurchaseNotAccepted", "PurchaseNotAccepted",
          Some(PlaceBetsErrorDetails(None, None, None, Seq(DeclinedBet(Seq(DeclineReason("PotentialReturnsCalculation", "The posted potential returns are not calculated correctly.", None))))))),
        ErrorDetails(ErrorCode.Unexpected, "Your bet could not be placed.", "Please try again."),
        Array("The posted potential returns are not calculated correctly.")
      )
    )
}
