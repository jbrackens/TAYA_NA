package phoenix.geocomply.infrastructure

import scala.annotation.nowarn
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import _root_.akka.actor.typed.ActorSystem
import _root_.akka.http.scaladsl.model.HttpRequest
import _root_.akka.http.scaladsl.model.HttpResponse
import _root_.akka.http.scaladsl.model.StatusCodes
import _root_.akka.http.scaladsl.unmarshalling.Unmarshal
import cats.data.EitherT
import org.slf4j.LoggerFactory

import phoenix.core.ScalaObjectUtils._
import phoenix.core.XmlUtils._
import phoenix.geocomply.GeoComplyConfig
import phoenix.geocomply.domain.GeoComplyLicenseService
import phoenix.geocomply.domain.GeoComplyLicenseService.FailedToRetrieveLicenseKey
import phoenix.geocomply.domain.License.GeoComplyLicense
import phoenix.geocomply.infrastructure.xml.LicenseKeyResponseXmlReader._
import phoenix.http.core.HttpClient

private[geocomply] final class AkkaHttpGeoComplyLicenseService(client: HttpClient, config: GeoComplyConfig)(implicit
    system: ActorSystem[_])
    extends GeoComplyLicenseService {

  private val log = LoggerFactory.getLogger(getClass)

  private implicit val ec: ExecutionContext = system.executionContext

  override def getLicenseKey(): EitherT[Future, FailedToRetrieveLicenseKey, GeoComplyLicense] =
    EitherT
      .liftAttemptK[Future, Throwable]
      .apply(fetchLicenseFromServer())
      .leftMap(error => {
        log.error(s"Failed to retrieve licence due to: ${error.getMessage}")
        FailedToRetrieveLicenseKey(error.getMessage)
      })

  // For the sake of binary compat, HttpResponse is NOT a case class, which causes exhaustiveness check to fail
  @nowarn("cat=other-match-analysis")
  private def fetchLicenseFromServer(): Future[GeoComplyLicense] = {
    val request = HttpRequest(uri = config.licenseServerUri.value)

    client.sendRequest(request).flatMap {
      case HttpResponse(StatusCodes.OK, _, entity, _) =>
        Unmarshal(entity)
          .to[String]
          .map(
            unmarshalled =>
              unmarshalled.parseXml
                .convertTo[GeoComplyLicense]
                .getOrElse(throw new RuntimeException(
                  s"Failed to convert entity to ${GeoComplyLicense.simpleObjectName}, raw body: $unmarshalled")))

      case HttpResponse(code, _, entity, _) =>
        Unmarshal(entity)
          .to[String]
          .map(unmarshalled =>
            throw new RuntimeException(s"GeoComply HTTP request failed with status '$code', raw body: $unmarshalled"))
    }
  }
}
