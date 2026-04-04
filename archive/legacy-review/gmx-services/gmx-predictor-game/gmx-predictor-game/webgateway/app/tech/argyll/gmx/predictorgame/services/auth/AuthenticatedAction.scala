package tech.argyll.gmx.predictorgame.services.auth

import com.typesafe.scalalogging.LazyLogging
import javax.inject.{Inject, Singleton}
import play.api.mvc.{Request, Result, _}
import tech.argyll.gmx.predictorgame.ErrorCodes.UNAUTHORISED
import tech.argyll.gmx.predictorgame.common.play.api.{ApiError, ResponseOps}
import tech.argyll.gmx.predictorgame.security.auth.{IAuthenticationService, InvalidTokenException, UserDetails}

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class AuthenticatedAction @Inject()(val parser: BodyParsers.Default, service: IAuthenticationService)(implicit val executionContext: ExecutionContext)
  extends ActionBuilder[AuthenticatedRequest, AnyContent]
    with ActionRefiner[Request, AuthenticatedRequest]
    with LazyLogging
    with ResponseOps {

  private val AUTH_HEADER_NAME = "Authorization"
  private val AUTH_BEARER = "^Bearer *([^ ]+) *".r

  private val unauthorized = Results.Unauthorized(fault(ApiError(UNAUTHORISED, s"Missing '$AUTH_HEADER_NAME' header or invalid 'Bearer'")))

  private def unauthorizedFor(e: Throwable) = {
    logger.warn(s"Couldn't authorize request", e)
    new Left(unauthorized)
  }

  override protected def refine[A](request: Request[A]): Future[Either[Result, AuthenticatedRequest[A]]] = {
    val authHeader = request.headers.get(AUTH_HEADER_NAME)

    val userDetails = authHeader.map(header =>
      Future {
        extractToken(header)
      }.flatMap(service.getUserInfo)
    )

    Future.sequence(Option.option2Iterable(userDetails))
      .map(_.headOption
        .map(AuthenticatedRequest(_, request))
        .toRight(unauthorized))
      .recover {
        case e @ (_: IllegalArgumentException | _: InvalidTokenException) => unauthorizedFor(e)
      }
  }


  def extractToken(input: String): String = {
    input match {
      case AUTH_BEARER(x) => x
      case _ => throw new IllegalArgumentException(s"Could not extract token from '$input'")
    }
  }
}

case class AuthenticatedRequest[A](user: UserDetails, request: Request[A]) extends WrappedRequest[A](request)