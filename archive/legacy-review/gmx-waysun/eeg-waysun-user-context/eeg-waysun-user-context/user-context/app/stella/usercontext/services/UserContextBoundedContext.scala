package stella.usercontext.services

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import io.circe.Json

import stella.common.http.jwt.Permission

import stella.usercontext.models.Ids.UserContextKey
import stella.usercontext.services.UserContextBoundedContext.Errors._

trait UserContextBoundedContext {
  def putUserContext(userContextKey: UserContextKey, userData: Json)(implicit
      ec: ExecutionContext): EitherT[Future, PutUserContextError, Unit]

  def modifyUserContext(userContextKey: UserContextKey, userDataDiff: Json)(implicit
      ec: ExecutionContext): EitherT[Future, ModifyUserContextError, Unit]

  def getUserContext(userContextKey: UserContextKey)(implicit
      ec: ExecutionContext): EitherT[Future, GetUserContextError, Json]

  def deleteUserContext(userContextKey: UserContextKey)(implicit
      ec: ExecutionContext): EitherT[Future, DeleteUserContextError, Unit]
}

object UserContextBoundedContext {

  object Errors {
    sealed trait PutUserContextError

    sealed trait ModifyUserContextError

    sealed trait GetUserContextError

    sealed trait DeleteUserContextError

    final case class UnexpectedUserContextError private (details: String, underlying: Option[Throwable])
        extends PutUserContextError
        with ModifyUserContextError
        with GetUserContextError
        with DeleteUserContextError

    object UnexpectedUserContextError {
      def apply(details: String): UnexpectedUserContextError =
        UnexpectedUserContextError(details, None)

      def apply(details: String, underlying: Throwable): UnexpectedUserContextError =
        UnexpectedUserContextError(details, Some(underlying))
    }
  }

  object UserContextPermissions {
    object UserContextAdminWritePermission extends Permission {
      override val value: String = "user_context:admin:context:write"
    }

    object UserContextAdminReadPermission extends Permission {
      override val value: String = "user_context:admin:context:read"
    }

    object UserContextWritePermission extends Permission {
      override val value: String = "user_context:context:write"
    }

    object UserContextReadPermission extends Permission {
      override val value: String = "user_context:context:read"
    }
  }
}
