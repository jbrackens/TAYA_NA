package phoenix.geocomply.infrastructure.http

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Route
import cats.data.EitherT
import io.circe.Json
import org.scalamock.scalatest.MockFactory

import phoenix.core.EitherTUtils._
import phoenix.geocomply.domain.GeoComplyLicenseService
import phoenix.geocomply.domain.GeoComplyLocationService
import phoenix.geocomply.domain.GeoComplyLocationService.FailedToDecryptGeoPacket
import phoenix.geocomply.domain.GeoComplyLocationService.FailedToParseGeoPacket
import phoenix.geocomply.domain.GeoComplyLocationService.GeoComplyEngineError
import phoenix.geocomply.domain.GeoLocation.AnotherGeolocationInSeconds
import phoenix.geocomply.domain.GeoLocation.ErrorSummaryCause.BlockedService
import phoenix.geocomply.domain.GeoLocation.ErrorSummaryCause.BlockedSoftware
import phoenix.geocomply.domain.GeoLocation.ErrorSummaryCause.OutOfBoundary
import phoenix.geocomply.domain.GeoLocation.ErrorSummaryCause.UnconfirmBoundary
import phoenix.geocomply.domain.GeoLocation.ErrorSummaryCause.UnconfirmUser
import phoenix.geocomply.domain.GeoLocation.GeoLocationPassed
import phoenix.geocomply.domain.GeoLocation.GeoLocationRejected
import phoenix.geocomply.domain.GeoLocation.TroubleshooterMessage
import phoenix.geocomply.support.GeoComplyDataGenerator.generateEncryptedGeoPacket
import phoenix.geocomply.support.GeoComplyLicenseServiceMock
import phoenix.geocomply.support.GeoComplyServiceMock
import phoenix.http.JsonMarshalling._
import phoenix.http.infrastructure.CirceJsonAssertions._
import phoenix.http.routes.RoutesSpecSupport

class GeoComplyRoutesSpec extends RoutesSpecSupport with MockFactory {

  "GeoComply routes" when {

    "GET /geo-comply/license-key" should {

      "return 200 and valid license key payload if successful" in {
        val routesUnderTest = buildRoutes(GeoComplyServiceMock.successful(), GeoComplyLicenseServiceMock.successful())
        Get("/geo-comply/license-key") ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.OK
          jsonFieldDecoded[String]("value") shouldBe defined
        }
      }

      "return 404  if unsuccessful" in {
        val routesUnderTest = buildRoutes(GeoComplyServiceMock.successful(), GeoComplyLicenseServiceMock.failing())
        Get("/geo-comply/license-key") ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.NotFound
          assertErrorResponse(responseAs[Json], "geoComplyLicenseKeysNotFound")
        }
      }
    }

    "POST /geo-comply/geo-packet" should {
      val geoComplyService: GeoComplyLocationService = stub[GeoComplyLocationService]
      val routesUnderTest = buildRoutes(geoComplyService, GeoComplyLicenseServiceMock.successful())

      "return 200 and Passed if GeoLocation successful" in {
        //given
        val givenGeoPacket = generateEncryptedGeoPacket()
        (geoComplyService.evaluateGeoPacket _)
          .when(givenGeoPacket)
          .returns(EitherT.safeRightT(GeoLocationPassed(AnotherGeolocationInSeconds(123))))
          .noMoreThanOnce()
        val request = s"""{"encryptedString":"${givenGeoPacket.encryptedString}"}"""

        //when
        Post("/geo-comply/geo-packet", request) ~> routesUnderTest ~> check {
          //then
          status shouldEqual StatusCodes.OK
          jsonFieldDecoded[String]("result") shouldBe Some("PASSED")
          jsonFieldDecoded[Int]("anotherGeolocationInSeconds") shouldBe Some(123)
        }
      }

      "return 200 and Rejected if GeoLocation failed" in {
        //given
        val givenGeoPacket = generateEncryptedGeoPacket()
        (geoComplyService.evaluateGeoPacket _)
          .when(givenGeoPacket)
          .returns(EitherT.safeRightT(GeoLocationRejected(
            List(UnconfirmBoundary, OutOfBoundary, BlockedService, BlockedSoftware, UnconfirmUser),
            List(
              TroubleshooterMessage(retry = false, "Blocked software", None, None),
              TroubleshooterMessage(retry = true, "Please enable location", Some("url"), Some("another"))))))
          .noMoreThanOnce()
        val request = s"""{"encryptedString":"${givenGeoPacket.encryptedString}"}"""

        //when
        Post("/geo-comply/geo-packet", request) ~> routesUnderTest ~> check {
          //then
          status shouldEqual StatusCodes.OK
          jsonFieldDecoded[String]("result") shouldBe Some("REJECTED")
          val response = responseAs[Json]

          response shouldHaveField ("errors", errors => {
            val errorsArray = errors.as[List[String]].getOrElse(List())

            errorsArray should contain theSameElementsAs List(
              "UNCONFIRM_BOUNDARY",
              "OUT_OF_BOUNDARY",
              "BLOCKED_SERVICE",
              "BLOCKED_SOFTWARE",
              "UNCONFIRM_USER")
          })

          response shouldHaveField ("reasons", reasons => {
            reasons shouldHaveElement (0, message => {
              message shouldHaveField ("retry", _.as[Boolean] shouldBe Right(false))
              message shouldHaveField ("message", _.as[String] shouldBe Right("Blocked software"))
              message shouldNotHaveField ("helpLink")
              message shouldNotHaveField ("optInLink")
            })
            reasons shouldHaveElement (1, message => {
              message shouldHaveField ("retry", _.as[Boolean] shouldBe Right(true))
              message shouldHaveField ("message", _.as[String] shouldBe Right("Please enable location"))
              message shouldHaveField ("helpLink", _.as[String] shouldBe Right("url"))
              message shouldHaveField ("optInLink", _.as[String] shouldBe Right("another"))
            })
          })
        }
      }

      "return 400 and GeoLocationServiceError if GeoLocation error" in {
        //given
        val givenGeoPacket = generateEncryptedGeoPacket()
        (geoComplyService.evaluateGeoPacket _)
          .when(givenGeoPacket)
          .returns(EitherT.leftT(GeoComplyEngineError))
          .noMoreThanOnce()
        val request = s"""{"encryptedString":"${givenGeoPacket.encryptedString}"}"""

        //when
        Post("/geo-comply/geo-packet", request) ~> routesUnderTest ~> check {
          //then
          status shouldEqual StatusCodes.InternalServerError
          assertErrorResponse(responseAs[Json], "geoLocationServiceError")
        }
      }

      "return 400 and FailedToParseGeoPacket if invalid decrypted XML" in {
        //given
        val givenGeoPacket = generateEncryptedGeoPacket()
        (geoComplyService.evaluateGeoPacket _)
          .when(givenGeoPacket)
          .returns(EitherT.leftT(FailedToParseGeoPacket))
          .noMoreThanOnce()
        val request = s"""{"encryptedString":"${givenGeoPacket.encryptedString}"}"""

        //when
        Post("/geo-comply/geo-packet", request) ~> routesUnderTest ~> check {
          //then
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "failedToParseGeoPacket")
        }
      }

      "return 500 and FailedToDecryptGeoPacket if invalid encrypted string" in {
        //given
        val givenGeoPacket = generateEncryptedGeoPacket()
        (geoComplyService.evaluateGeoPacket _)
          .when(givenGeoPacket)
          .returns(EitherT.leftT(FailedToDecryptGeoPacket))
          .noMoreThanOnce()
        val request = s"""{"encryptedString":"${givenGeoPacket.encryptedString}"}"""

        //when
        Post("/geo-comply/geo-packet", request) ~> routesUnderTest ~> check {
          //then
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "failedToDecryptGeoPacket")
        }
      }
    }
  }

  def buildRoutes(
      geoComplyService: GeoComplyLocationService,
      geoComplyLicenseService: GeoComplyLicenseService): Route = {
    val routes = new GeoComplyRoutes(geoComplyService, geoComplyLicenseService)
    Route.seal(routes.toAkkaHttp)
  }
}
