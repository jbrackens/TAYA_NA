package phoenix.geocomply.infrastructure.http

import scala.concurrent.ExecutionContext

import sttp.model.StatusCode

import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.geocomply.domain.GeoComplyLicenseService
import phoenix.geocomply.domain.GeoComplyLicenseService.FailedToRetrieveLicenseKey
import phoenix.geocomply.domain.GeoComplyLocationService
import phoenix.geocomply.domain.GeoComplyLocationService.FailedToDecryptGeoPacket
import phoenix.geocomply.domain.GeoComplyLocationService.FailedToParseGeoPacket
import phoenix.geocomply.domain.GeoComplyLocationService.GeoComplyEngineError
import phoenix.http.core.Routes

final class GeoComplyRoutes(geoComplyService: GeoComplyLocationService, licenseService: GeoComplyLicenseService)(
    implicit ec: ExecutionContext)
    extends Routes {

  val licenseKey =
    GeoComplyTapirEndpoints.licenseKey.serverLogic { _ =>
      licenseService
        .getLicenseKey()
        .bimap(
          (_: FailedToRetrieveLicenseKey) =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.GeoComplyLicenseKeysNotFound),
          license => license.licenseKey)
        .value
    }

  val evaluateGeoPacket =
    GeoComplyTapirEndpoints.evaluateGeoPacket.serverLogic { encryptedGeoPacket =>
      geoComplyService
        .evaluateGeoPacket(encryptedGeoPacket)
        .leftMap {
          case FailedToDecryptGeoPacket =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.FailedToDecryptGeoPacket)
          case FailedToParseGeoPacket =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.FailedToParseGeoPacket)
          case GeoComplyEngineError =>
            ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.GeoLocationServiceError)
        }
        .value
    }

  override val endpoints: Routes.Endpoints = List(licenseKey, evaluateGeoPacket)
}
