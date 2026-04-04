package net.flipsports.gmx.webapiclient.sbtech.betting

import com.softwaremill.sttp.testing.SttpBackendStub
import com.softwaremill.sttp.{ Response, StatusCodes }
import com.typesafe.config.ConfigFactory
import net.flipsports.gmx.common.webapi.ExternalCallException
import net.flipsports.gmx.webapiclient.sbtech.betting.config.BettingAPIConfig
import net.flipsports.gmx.webapiclient.sbtech.betting.dto.PlaceBetsRequest
import org.junit.runner.RunWith
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.prop.TableDrivenPropertyChecks
import org.scalatest.{ FunSuite, Matchers, RecoverMethods }
import play.api.libs.json.{ JsArray, Json }

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

@RunWith(classOf[JUnitRunner])
class BettingAPIClientImplSpec
    extends FunSuite
    with TableDrivenPropertyChecks
    with RecoverMethods
    with ScalaFutures
    with Matchers
    with MockitoSugar {

  private implicit val backend: SttpBackendStub[Future, Nothing] = SttpBackendStub.asynchronousFuture
  private val config = BettingAPIConfig(ConfigFactory.load())

  private def mockResponse(givenResponse: Response[_]) =
    new BettingAPIClientImpl(config)(backend.whenAnyRequest.thenRespond(givenResponse), global)

  private def loadFile(resource: String): IndexedSeq[String] = {
    Json.parse(getClass.getResourceAsStream(resource)).as[JsArray].value.map(_.toString())
  }

  test("'callPlaceBets()' SHOULD handle invalid JWT errors") {
    forAll(tokenErrors) { (givenResponse: Response[_], expectedError: String) =>
      // given
      val objectUnderTest: BettingAPIClientImpl = mockResponse(givenResponse)

      // when
      val eventualResponse = objectUnderTest.callPlaceBets("anyToken", PlaceBetsRequest(Seq(), Seq()))

      // then
      whenReady(recoverToExceptionIf[ExternalCallException](eventualResponse)) { actualException =>
        actualException shouldBe a[ExternalCallException]
        actualException.getMessage should be(expectedError)
      }
    }
  }

  private lazy val tokenErrors = {
    val tokenErrorsJson = loadFile("tokenErrors.json")
    Table(
      ("givenResponse", "expectedError"),
      (
        Response.error(tokenErrorsJson(0), StatusCodes.Unauthorized),
        """Missing or invalid JWT token: {"exp":"token expired"}"""),
      (
        Response.error(tokenErrorsJson(1), StatusCodes.Unauthorized),
        """Missing or invalid JWT token: {"message":"Bad token; invalid JSON"}"""),
      (
        Response.error(tokenErrorsJson(2), StatusCodes.Forbidden),
        """Missing or invalid JWT token: {"message":"Invalid algorithm"}""")
    )
  }

  test("'callPlaceBets()' SHOULD handle basic errors") {
    forAll(basicErrors) { (givenResponse: Response[_], expectedStatus: String) =>
      // given
      val objectUnderTest: BettingAPIClientImpl = mockResponse(givenResponse)

      // when
      val eventualResponse = objectUnderTest.callPlaceBets("anyToken", PlaceBetsRequest(Seq(), Seq()))

      // then
      whenReady(eventualResponse) { actualResponse =>
        actualResponse.isLeft should be(true)
        actualResponse.left.get.statusCode should be(expectedStatus)
      }
    }
  }

  private lazy val basicErrors = {
    val basicErrorsJson = loadFile("basicErrors.json")
    Table(
      ("givenResponse", "expectedStatus"),
      (
        Response.error(basicErrorsJson(0), StatusCodes.UnprocessableEntity),
        "InvalidSelection"),
      (
        Response.error(basicErrorsJson(1), StatusCodes.BadRequest),
        "ValidationError"),
      (
        Response.error(basicErrorsJson(2), StatusCodes.InternalServerError),
        "InternalServerError"),
      (
        Response.error(basicErrorsJson(3), StatusCodes.UnprocessableEntity),
        "OddsNotMatch"),
      (
        Response.error(basicErrorsJson(4), StatusCodes.UnprocessableEntity),
        "OddsValidationError"),
      (
        Response.error(basicErrorsJson(5), StatusCodes.UnprocessableEntity),
        "ServiceNotAvailable")
    )
  }

  test("'callPlaceBets()' SHOULD handle purchase errors with details") {
    forAll(purchaseErrors) { (givenResponse: Response[_], expectedStatus: String, expectedReason: String) =>
      // given
      val objectUnderTest: BettingAPIClientImpl = mockResponse(givenResponse)

      // when
      val eventualResponse = objectUnderTest.callPlaceBets("anyToken", PlaceBetsRequest(Seq(), Seq()))

      // then
      whenReady(eventualResponse) { actualResponse =>
        actualResponse.isLeft should be(true)
        actualResponse.left.get.statusCode should be(expectedStatus)
        actualResponse.left.get.response.get.bets.head.declineReasons.head.name should be(expectedReason)
      }
    }
  }

  private lazy val purchaseErrors = {
    val purchaseErrors = loadFile("purchaseErrors.json")
    Table(
      ("givenResponse", "expectedStatus", "expectedReason"),
      (
        Response.error(purchaseErrors(0), StatusCodes.UnprocessableEntity),
        "PurchaseNotAccepted", "CustomerLimitsError"),
      (
        Response.error(purchaseErrors(1), StatusCodes.BadRequest),
        "PurchaseNotAccepted", "PotentialReturnsCalculation"),
      (
        Response.error(purchaseErrors(2), StatusCodes.InternalServerError),
        "PurchaseNotAccepted", "OddsNotMatch"),
      (
        Response.error(purchaseErrors(3), StatusCodes.UnprocessableEntity),
        "PurchaseNotAccepted", "OddsNotMatch"))
  }
}
