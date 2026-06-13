package phoenix.geocomply.infrastructure

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.geocomply.domain.GeoComplyLicenseService
import phoenix.geocomply.domain.GeoComplyLicenseService.FailedToRetrieveLicenseKey
import phoenix.geocomply.domain.License.GeoComplyLicense
import phoenix.geocomply.support.GeoComplyDataGenerator.generateValidLicense
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

final class CachedGeoComplyLicenseServiceSpec extends AnyWordSpecLike with Matchers with FutureSupport {

  private implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())
  private val licenseKeyStub = new LicenseServiceStub()
  private val clockStub = new FakeHardcodedClock()

  "CachedGeoComplyLicenseService" should {
    "properly cache license" in {
      // given
      val objectUnderTest = new CachedGeoComplyLicenseService(licenseKeyStub, clockStub)

      // when
      val oldLicenseExpiration = OffsetDateTime.of(2021, 6, 10, 10, 0, 0, 0, ZoneOffset.UTC)
      val oldLicense = generateValidLicense(expirationDate = oldLicenseExpiration)
      licenseKeyStub.respondWithLicense(oldLicense)
      clockStub.setFixedTime(oldLicenseExpiration.minusHours(1))

      // then
      awaitRight(objectUnderTest.getLicenseKey()) shouldBe oldLicense

      // when
      val newLicenseExpiration = oldLicenseExpiration.plusHours(2)
      val newLicense = generateValidLicense(expirationDate = newLicenseExpiration)
      licenseKeyStub.respondWithLicense(newLicense)

      // and
      clockStub.setFixedTime(oldLicenseExpiration.minusNanos(1))

      // then
      awaitRight(objectUnderTest.getLicenseKey()) shouldBe oldLicense

      // when
      clockStub.setFixedTime(oldLicenseExpiration)

      // then
      awaitRight(objectUnderTest.getLicenseKey()) shouldBe newLicense
    }

    "should not cache errors" in {
      // given
      val objectUnderTest = new CachedGeoComplyLicenseService(licenseKeyStub, clockStub)

      // when
      val pointInTime = clockStub.currentOffsetDateTime()
      licenseKeyStub.respondWithError(FailedToRetrieveLicenseKey("something went wrong"))

      // then
      awaitLeft(objectUnderTest.getLicenseKey()) shouldBe a[FailedToRetrieveLicenseKey]

      // when
      val aLicense = generateValidLicense(expirationDate = pointInTime.plusHours(1))
      licenseKeyStub.respondWithLicense(aLicense)

      // then
      awaitRight(objectUnderTest.getLicenseKey()) shouldBe aLicense
    }
  }
}

final class LicenseServiceStub(implicit ec: ExecutionContext) extends GeoComplyLicenseService {
  private var currentKeyResponse: Either[FailedToRetrieveLicenseKey, GeoComplyLicense] = Left(
    FailedToRetrieveLicenseKey("No key on the server"))

  override def getLicenseKey(): EitherT[Future, FailedToRetrieveLicenseKey, GeoComplyLicense] =
    EitherT.fromEither(currentKeyResponse)

  def respondWithError(error: FailedToRetrieveLicenseKey): Unit =
    currentKeyResponse = Left(error)

  def respondWithLicense(license: GeoComplyLicense): Unit =
    currentKeyResponse = Right(license)
}
