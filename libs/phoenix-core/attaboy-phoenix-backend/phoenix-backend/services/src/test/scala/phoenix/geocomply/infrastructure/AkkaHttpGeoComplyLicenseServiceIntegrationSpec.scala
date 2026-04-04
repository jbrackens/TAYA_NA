package phoenix.geocomply.infrastructure

import _root_.akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.geocomply.GeoComplyConfig
import phoenix.geocomply.domain.GeoComplyLicenseService.FailedToRetrieveLicenseKey
import phoenix.geocomply.domain.License.GeoComplyLicense
import phoenix.geocomply.support.HttpClientMock
import phoenix.geocomply.support.HttpClientMock.TestResponse
import phoenix.support.ConfigFactory
import phoenix.support.FileSupport
import phoenix.support.FutureSupport

final class AkkaHttpGeoComplyLicenseServiceIntegrationSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with FileSupport {

  private val expectedUrl = "https://stg-auth.geocomply.net/license.php?akey=foo&skey=bar"

  private val licenseKeyResponseStr =
    stringFromResource(baseDir = "data/geocomply", fileName = "license-key-response.xml")

  "AkkaHttpGeoComplyLicenseService" when {
    val config = GeoComplyConfig.of(
      ConfigFactory.forIntegrationTesting(Map("GEOCOMPLY_API_KEY" -> "foo", "GEOCOMPLY_SECRET_KEY" -> "bar")))

    "getLicenseKey" should {
      "return LicenseKeyResponse on valid result" in {
        // given
        val httpClient = HttpClientMock.withRequestValidation(List(TestResponse(expectedUrl, licenseKeyResponseStr)))

        val objectUnderTest = new AkkaHttpGeoComplyLicenseService(httpClient, config)(system)

        // when
        val actualResponse = awaitRight(objectUnderTest.getLicenseKey())

        // then
        actualResponse shouldBe a[GeoComplyLicense]
      }
      "fail on invalid result" in {
        // given
        val httpClient =
          HttpClientMock.withRequestValidation(List(TestResponse(expectedUrl, "<invalid-XML></invalid-XML>")))

        val objectUnderTest = new AkkaHttpGeoComplyLicenseService(httpClient, config)(system)

        // when
        val attempt = awaitLeft(objectUnderTest.getLicenseKey())

        // then
        attempt shouldBe a[FailedToRetrieveLicenseKey]
      }
      "fail on request error" in {
        // given
        val httpClient = HttpClientMock.withRequestValidation(
          List(TestResponse("invalid-url-causing-HttpClientMock-exception", licenseKeyResponseStr)))

        val objectUnderTest = new AkkaHttpGeoComplyLicenseService(httpClient, config)(system)

        // when
        val attempt = awaitLeft(objectUnderTest.getLicenseKey())

        // then
        attempt shouldBe a[FailedToRetrieveLicenseKey]
      }
    }
  }
}
