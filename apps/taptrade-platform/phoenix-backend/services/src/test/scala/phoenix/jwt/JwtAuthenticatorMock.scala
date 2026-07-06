package phoenix.jwt

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.instances.future._

import phoenix.core.EitherTUtils.EitherTCompanionOps
import phoenix.http.BearerToken
import phoenix.jwt.JwtAuthenticator.InvalidAuthTokenError
import phoenix.jwt.Permissions.UserId
import phoenix.jwt.Permissions.Username
import phoenix.support.DataGenerator.generateIdentifier

object JwtAuthenticatorMock {
  val invalidToken: BearerToken = BearerToken("invalidToken")
  val adminToken: BearerToken = BearerToken("adminToken")
  val traderToken: BearerToken = BearerToken("traderToken")
  val operatorToken: BearerToken = BearerToken("operatorToken")
  val punterToken: BearerToken = BearerToken("punterToken")

  def jwtAuthenticatorMock(
      userId: UserId = UserId(generateIdentifier()),
      username: Username = Username(generateIdentifier())): JwtAuthenticator =
    new JwtAuthenticator {
      override def verifyWithoutIntrospection(token: BearerToken)(implicit
          ec: ExecutionContext): EitherT[Future, InvalidAuthTokenError, Permissions] = {
        EitherT.fromEither {
          token match {
            case `adminToken`    => Right(createPermissions(isAdmin = true, roles = Set("admin")))
            case `traderToken`   => Right(createPermissions(isAdmin = false, roles = Set("trader")))
            case `operatorToken` => Right(createPermissions(isAdmin = false, roles = Set("operator")))
            case `punterToken`   => Right(createPermissions(isAdmin = false, roles = Set("punter")))
            case _ =>
              Left(JwtAuthenticator.InvalidAuthTokenError(new RuntimeException("Invalid auth token")))
          }
        }
      }

      private def createPermissions(isAdmin: Boolean, roles: Set[String]): Permissions =
        Permissions(userId, username, isAdmin, roles)

      override def introspectTokenOnProvider(bearerToken: BearerToken)(implicit
          ec: ExecutionContext): EitherT[Future, JwtAuthenticator.InactiveAuthTokenError.type, Unit] = {
        EitherT.safeRightT(())
      }
    }
}
