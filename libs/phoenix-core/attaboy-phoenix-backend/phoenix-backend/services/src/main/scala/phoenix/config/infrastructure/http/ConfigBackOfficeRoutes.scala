package phoenix.config.infrastructure.http

import scala.concurrent.ExecutionContext

import sttp.model.StatusCode
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._
import sttp.tapir.statusCode

import phoenix.config.infrastructure.ConfigJsonFormats.changeTermsRequestCodec
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives.adminEndpoint
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator
import phoenix.punters.domain._

class ConfigBackOfficeRoutes(basePath: MountPoint, termsAndConditionsRepository: TermsAndConditionsRepository)(implicit
    auth: JwtAuthenticator,
    ec: ExecutionContext)
    extends Routes
    with TapirCodecEnumeratum {

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.config.infrastructure.http.ConfigTapirSchemas._

  private val setTermsAndConditions =
    adminEndpoint.post.in(basePath / "upload-terms").in(jsonBody[TermsRequest]).out(statusCode(StatusCode.Ok))

  private val setTermsAndConditionsRoute =
    setTermsAndConditions.serverLogic { _ => terms =>
      termsAndConditionsRepository
        .insert(terms.toTerms)
        .leftMap(_ => ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.TermsAlreadyExist))
        .value
    }

  override val endpoints: Routes.Endpoints = List(setTermsAndConditionsRoute)

}
final case class TermsRequest(
    currentTermsVersion: CurrentTermsVersion,
    termsContent: TermsContent,
    termsDaysThreshold: Option[TermsDaysThreshold]) {
  def toTerms: Terms =
    Terms(
      this.currentTermsVersion,
      this.termsContent,
      this.termsDaysThreshold.getOrElse(TermsDaysThreshold(value = 365)))
}
