package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.auth

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.play.api.ResponseOps
import net.flipsports.gmx.widget.argyll.betandwatch.common.auth.{IAuthenticationService, InvalidTokenException, UserDetails}
import net.flipsports.gmx.widget.argyll.betandwatch.webgateway.auth.AuthenticatedAction.AuthResult
import play.api.mvc.{Request, _}

import scala.concurrent.{ExecutionContext, Future}

class AuthenticatedAction(val parser: BodyParser[AnyContent], service: IAuthenticationService)(implicit val executionContext: ExecutionContext)
  extends ActionBuilder[AuthenticatedRequest, AnyContent]
    with ActionTransformer[Request, AuthenticatedRequest]
    with LazyLogging
    with ResponseOps {

  private val AUTH_HEADER_NAME = "Authorization"
  private val AUTH_BEARER = "^Bearer *([^ ]+) *".r

  override protected def transform[A](request: Request[A]): Future[AuthenticatedRequest[A]] = {
    val authHeader = request.headers.get(AUTH_HEADER_NAME)

    val userDetails = authHeader.map(header =>
      loadUser(request, header)
        .recover {
          case e: IllegalArgumentException => unauthorizedFor(request, e)
          case e: InvalidTokenException => unauthorizedFor(request, e)
        })

    userDetails
      .getOrElse(Future.successful(unauthorized(request)))
  }

  private def loadUser[A](request: Request[A], header: String) = {
    for {
      token <- Future {
        extractToken(header)
      }
      userInfo <- service.getUserInfo(token)
    } yield AuthenticatedRequest(Right(userInfo), request)
  }

  private def extractToken(input: String): String = {
    input match {
      case AUTH_BEARER(x) => x
      case _ => throw new IllegalArgumentException(s"Could not extract token from '$input'")
    }
  }

  private def unauthorizedFor[A](request: Request[A], e: Exception): AuthenticatedRequest[A] = {
    logger.warn("Couldn't authorize request CAUSE: {}", e.getMessage)
    unauthorized(request)
  }

  private def unauthorized[A](request: Request[A]): AuthenticatedRequest[A] = {
    AuthenticatedRequest(Left(s"Missing '$AUTH_HEADER_NAME' header or invalid 'Bearer'"), request)
  }
}

object AuthenticatedAction {
  type AuthResult = Either[String, UserDetails]
}

case class AuthenticatedRequest[A](user: AuthResult, request: Request[A]) extends WrappedRequest[A](request)