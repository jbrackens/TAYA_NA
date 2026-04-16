package phoenix.geocomply.infrastructure

import java.time.OffsetDateTime
import java.util.concurrent.atomic.AtomicReference

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Success

import cats.data.EitherT

import phoenix.core.Clock
import phoenix.geocomply.domain.GeoComplyLicenseService
import phoenix.geocomply.domain.GeoComplyLicenseService.FailedToRetrieveLicenseKey
import phoenix.geocomply.domain.License.GeoComplyLicense

private[geocomply] final class CachedGeoComplyLicenseService(delegate: GeoComplyLicenseService, clock: Clock)(implicit
    ec: ExecutionContext)
    extends GeoComplyLicenseService {

  private lazy val cachedLicense: AtomicReference[Future[Either[FailedToRetrieveLicenseKey, GeoComplyLicense]]] =
    new AtomicReference(delegate.getLicenseKey().value)

  override def getLicenseKey(): EitherT[Future, FailedToRetrieveLicenseKey, GeoComplyLicense] = {
    val now = clock.currentOffsetDateTime()
    EitherT(lookupInCache(now))
  }

  private def lookupInCache(pointInTime: OffsetDateTime): Future[Either[FailedToRetrieveLicenseKey, GeoComplyLicense]] =
    cachedLicense.updateAndGet(previous =>
      previous.transformWith {
        case Success(cached @ Right(license)) if license.isNotExpiredAt(pointInTime) =>
          Future.successful(cached)

        case _ =>
          delegate.getLicenseKey().value
      })
}
