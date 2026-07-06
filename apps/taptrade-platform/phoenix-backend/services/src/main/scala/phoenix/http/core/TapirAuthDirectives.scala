package phoenix.http.core
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.either._
import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.endpoint
import sttp.tapir.generic.auto._
import sttp.tapir.model.UsernamePassword
import sttp.tapir.server.PartialServerEndpoint
import sttp.tapir.statusCode

import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.http.BearerToken
import phoenix.http.core.TapirAuthDirectives.PresentationErrors.badRequest
import phoenix.http.core.TapirAuthDirectives.PresentationErrors.forbidden
import phoenix.http.core.TapirAuthDirectives.PresentationErrors.unauthorized
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.JwtAuthenticator.JwtAuthenticationError
import phoenix.jwt.Permissions
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.AccountVerificationCodeRepository
import phoenix.punters.domain.PunterProfile
import phoenix.punters.domain.PunterStatus._
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.SuspensionEntity.NegativeBalance

object TapirAuthDirectives {
  type ErrorOut = (StatusCode, ErrorResponse)
  type PunterProfileAuthorizer = PunterProfile => Either[ErrorOut, Unit]

  private[core] object StatusValidators {

    val allowUnverified: PunterProfileAuthorizer = _.status match {
      case Unverified => ().asRight
      case _          => forbidden(PresentationErrorCode.PunterIsVerified).asLeft
    }

    val allowActive_CoolOff: PunterProfileAuthorizer = _.status match {
      case Active       => ().asRight
      case Deleted      => forbidden(PresentationErrorCode.PunterIsDeleted).asLeft
      case InCoolOff    => ().asRight
      case SelfExcluded => forbidden(PresentationErrorCode.PunterIsInSelfExclusion).asLeft
      case Suspended(_) => forbidden(PresentationErrorCode.PunterIsSuspended).asLeft
      case Unverified   => forbidden(PresentationErrorCode.PunterIsUnverified).asLeft
    }

    val allowActive_CoolOff_Negative: PunterProfileAuthorizer = _.status match {
      case Active                        => ().asRight
      case Deleted                       => forbidden(PresentationErrorCode.PunterIsDeleted).asLeft
      case InCoolOff                     => ().asRight
      case SelfExcluded                  => forbidden(PresentationErrorCode.PunterIsInSelfExclusion).asLeft
      case Suspended(NegativeBalance(_)) => ().asRight
      case Suspended(_)                  => forbidden(PresentationErrorCode.PunterIsSuspended).asLeft
      case Unverified                    => forbidden(PresentationErrorCode.PunterIsUnverified).asLeft
    }

    val allowActive_CoolOff_Unverified: PunterProfileAuthorizer = _.status match {
      case Active                        => ().asRight
      case Deleted                       => forbidden(PresentationErrorCode.PunterIsDeleted).asLeft
      case InCoolOff                     => ().asRight
      case SelfExcluded                  => forbidden(PresentationErrorCode.PunterIsInSelfExclusion).asLeft
      case Suspended(NegativeBalance(_)) => ().asRight
      case Suspended(_)                  => forbidden(PresentationErrorCode.PunterIsSuspended).asLeft
      case Unverified                    => ().asRight
    }

    val allowActive: PunterProfileAuthorizer = _.status match {
      case Active       => ().asRight
      case Deleted      => forbidden(PresentationErrorCode.PunterIsDeleted).asLeft
      case InCoolOff    => forbidden(PresentationErrorCode.PunterIsInCoolOff).asLeft
      case SelfExcluded => forbidden(PresentationErrorCode.PunterIsInSelfExclusion).asLeft
      case Suspended(_) => forbidden(PresentationErrorCode.PunterIsSuspended).asLeft
      case Unverified   => forbidden(PresentationErrorCode.PunterIsUnverified).asLeft
    }

    val allowActiveAndNegative: PunterProfileAuthorizer = _.status match {
      case Active                        => ().asRight
      case Suspended(NegativeBalance(_)) => ().asRight
      case Deleted                       => forbidden(PresentationErrorCode.PunterIsDeleted).asLeft
      case InCoolOff                     => forbidden(PresentationErrorCode.PunterIsInCoolOff).asLeft
      case SelfExcluded                  => forbidden(PresentationErrorCode.PunterIsInSelfExclusion).asLeft
      case Suspended(_)                  => forbidden(PresentationErrorCode.PunterIsSuspended).asLeft
      case Unverified                    => forbidden(PresentationErrorCode.PunterIsUnverified).asLeft
    }
  }

  object PresentationErrors {
    def forbidden(error: PresentationErrorCode): ErrorOut =
      ErrorResponse.tupled(StatusCode.Forbidden, error)

    def badRequest(error: PresentationErrorCode): ErrorOut =
      ErrorResponse.tupled(StatusCode.BadRequest, error)

    def unauthorized(error: PresentationErrorCode): ErrorOut =
      ErrorResponse.tupled(StatusCode.Unauthorized, error)
  }

  private def verifyJwtToken(jwtToken: Option[String])(implicit
      authenticator: JwtAuthenticator,
      ec: ExecutionContext): EitherT[Future, (StatusCode, ErrorResponse), Permissions] =
    jwtToken match {
      case None =>
        EitherT.fromEither(unauthorized(PresentationErrorCode.UnauthorizedRequest).asLeft[Permissions])
      case Some(jwtToken) =>
        verifyToken(authenticator, jwtToken)
    }

  private def verifyToken(auth: JwtAuthenticator, jwtToken: String)(implicit
      ec: ExecutionContext): EitherT[Future, ErrorOut, Permissions] =
    auth.verifyWithIntrospection(BearerToken(jwtToken)).leftMap(toErrorOut)

  private def retrievePunterProfile(punters: PuntersBoundedContext, punterId: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, ErrorOut, PunterProfile] =
    punters.getPunterProfile(punterId).leftMap(_ => forbidden(PresentationErrorCode.PunterProfileDoesNotExist))

  def authorizePunterProfile(statusValidator: PunterProfileAuthorizer, profile: PunterProfile)(implicit
      ec: ExecutionContext): EitherT[Future, ErrorOut, Unit] =
    EitherT.fromEither(statusValidator(profile))

  def endpointWithError: Endpoint[Unit, Unit, ErrorOut, Unit, Any] =
    endpoint.errorOut(statusCode).errorOut(jsonBody[ErrorResponse])

  private[core] def guardPunterProfileAuthorization(
      punterId: PunterId,
      punters: PuntersBoundedContext,
      profileAuthorizer: PunterProfileAuthorizer)(implicit
      ec: ExecutionContext): EitherT[Future, ErrorOut, PunterProfile] =
    for {
      punterProfile <- retrievePunterProfile(punters, punterId)
      _ <- authorizePunterProfile(profileAuthorizer, punterProfile)
    } yield punterProfile

  def adminEndpoint(implicit
      authenticator: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[String, AdminId, Unit, ErrorOut, Unit, Any, Future] =
    endpointWithError.securityIn(auth.bearer[String]()).serverSecurityLogic { jwtToken =>
      verifyToken(authenticator, jwtToken)
        .ensureOr(_ => forbidden(PresentationErrorCode.UserMissingAdminRole))(_.isAdmin)
        .map(permissions => AdminId(permissions.userId.value))
        .value
    }

  def auditLogReadEndpoint(implicit
      authenticator: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[String, Permissions, Unit, ErrorOut, Unit, Any, Future] =
    endpointWithError.securityIn(auth.bearer[String]()).serverSecurityLogic { jwtToken =>
      verifyToken(authenticator, jwtToken).value
    }

  def predictionOpsReadEndpoint(implicit
      authenticator: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[String, Permissions, Unit, ErrorOut, Unit, Any, Future] =
    endpointWithError.securityIn(auth.bearer[String]()).serverSecurityLogic { jwtToken =>
      verifyToken(authenticator, jwtToken)
        .ensureOr(_ => forbidden(PresentationErrorCode.UserMissingPredictionOpsRole))(_.canViewPredictionOps)
        .value
    }

  def predictionOpsReversibleStateEndpoint(implicit
      authenticator: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[String, Permissions, Unit, ErrorOut, Unit, Any, Future] =
    endpointWithError.securityIn(auth.bearer[String]()).serverSecurityLogic { jwtToken =>
      verifyToken(authenticator, jwtToken)
        .ensureOr(_ => forbidden(PresentationErrorCode.UserMissingPredictionOpsRole))(_.canManagePredictionReversibleState)
        .value
    }

  def predictionOpsLifecycleEndpoint(implicit
      authenticator: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[String, Permissions, Unit, ErrorOut, Unit, Any, Future] =
    predictionOpsReversibleStateEndpoint

  def predictionOpsDestructiveOverrideEndpoint(implicit
      authenticator: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[String, Permissions, Unit, ErrorOut, Unit, Any, Future] =
    endpointWithError.securityIn(auth.bearer[String]()).serverSecurityLogic { jwtToken =>
      verifyToken(authenticator, jwtToken)
        .ensureOr(_ => forbidden(PresentationErrorCode.UserMissingAdminRole))(_.canManagePredictionDestructiveOverrides)
        .value
    }

  def predictionOpsOrderReadEndpoint(implicit
      authenticator: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[String, Permissions, Unit, ErrorOut, Unit, Any, Future] =
    endpointWithError.securityIn(auth.bearer[String]()).serverSecurityLogic { jwtToken =>
      verifyToken(authenticator, jwtToken)
        .ensureOr(_ => forbidden(PresentationErrorCode.UserMissingPredictionOpsRole))(_.canViewPredictionOrderFlow)
        .value
    }

  def predictionOpsSettlementEndpoint(implicit
      authenticator: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[String, Permissions, Unit, ErrorOut, Unit, Any, Future] =
    endpointWithError.securityIn(auth.bearer[String]()).serverSecurityLogic { jwtToken =>
      verifyToken(authenticator, jwtToken)
        .ensureOr(_ => forbidden(PresentationErrorCode.UserMissingAdminRole))(_.canManagePredictionSettlement)
        .value
    }

  def allowUnverifiedEndpointJwt(punters: PuntersBoundedContext)(implicit
      auth: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[Option[String], PunterId, Unit, ErrorOut, Unit, Any, Future] =
    punterEndpointWithStatusValidationJwt(StatusValidators.allowUnverified, punters)

  def allowActive_CoolOff_EndpointJwt(punters: PuntersBoundedContext)(implicit
      auth: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[Option[String], PunterId, Unit, ErrorOut, Unit, Any, Future] =
    punterEndpointWithStatusValidationJwt(StatusValidators.allowActive_CoolOff, punters)

  def allowActive_CoolOff_NegativeEndpointJwt(punters: PuntersBoundedContext)(implicit
      auth: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[Option[String], PunterId, Unit, ErrorOut, Unit, Any, Future] =
    punterEndpointWithStatusValidationJwt(StatusValidators.allowActive_CoolOff_Negative, punters)

  def allowActive_CoolOff_NegativeAndUnverifiedEndpointJwt(punters: PuntersBoundedContext)(implicit
      auth: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[Option[String], PunterId, Unit, ErrorOut, Unit, Any, Future] =
    punterEndpointWithStatusValidationJwt(StatusValidators.allowActive_CoolOff_Unverified, punters)

  def allowActivePunterEndpointJwt(punters: PuntersBoundedContext)(implicit
      auth: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[Option[String], PunterId, Unit, ErrorOut, Unit, Any, Future] =
    punterEndpointWithStatusValidationJwt(StatusValidators.allowActive, punters)

  def allowActiveAndNegativePunterEndpointJwt(punters: PuntersBoundedContext)(implicit
      auth: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[Option[String], PunterId, Unit, ErrorOut, Unit, Any, Future] =
    punterEndpointWithStatusValidationJwt(StatusValidators.allowActiveAndNegative, punters)

  def allowActive_CoolOff_NegativeEndpoint[T](
      endpointInput: EndpointInput[T],
      findRegisteredUser: T => Future[Option[RegisteredUserKeycloak]],
      punters: PuntersBoundedContext)(implicit ec: ExecutionContext)
      : PartialServerEndpoint[T, (T, RegisteredUserKeycloak, PunterProfile), Unit, ErrorOut, Unit, Any, Future] = {
    punterEndpointWithStatusValidation[T](
      endpointInput,
      findRegisteredUser,
      StatusValidators.allowActive_CoolOff_Unverified,
      punters)
  }

  def authByAccountVerificationCodeAndAuthorizeActive(
      authCode: UUID,
      accountVerificationCodeRepository: AccountVerificationCodeRepository,
      puntersBoundedContext: PuntersBoundedContext)(implicit
      ec: ExecutionContext): EitherT[Future, ErrorOut, PunterId] =
    for {
      punterId <- authenticateWithCode(accountVerificationCodeRepository)(authCode)
      _ <- guardPunterProfileAuthorization(punterId, puntersBoundedContext, StatusValidators.allowActiveAndNegative)
    } yield punterId

  def authenticateWithCode(accountVerificationCodeRepository: AccountVerificationCodeRepository)(authCode: UUID)(
      implicit ec: ExecutionContext): EitherT[Future, ErrorOut, PunterId] =
    EitherT
      .fromOptionF(
        accountVerificationCodeRepository.validate(authCode),
        ifNone = badRequest(PresentationErrorCode.InvalidVerificationCode))
      .map(avc => PunterId.fromUuid(avc.userID))

  private def punterEndpointWithStatusValidation[T](
      endpointInput: EndpointInput[T],
      findRegisteredUser: T => Future[Option[RegisteredUserKeycloak]],
      profileAuthorizer: PunterProfileAuthorizer,
      puntersBoundedContext: PuntersBoundedContext)(implicit ec: ExecutionContext)
      : PartialServerEndpoint[T, (T, RegisteredUserKeycloak, PunterProfile), Unit, ErrorOut, Unit, Any, Future] =
    endpointWithError.securityIn(endpointInput).serverSecurityLogic { request =>
      (for {
        registeredUserKeycloak <-
          EitherT.fromOptionF(findRegisteredUser(request), badRequest(PresentationErrorCode.PunterProfileDoesNotExist))
        punterId = registeredUserKeycloak.userId.asPunterId
        punterProfile <- guardPunterProfileAuthorization(punterId, puntersBoundedContext, profileAuthorizer)
      } yield (request, registeredUserKeycloak, punterProfile)).value
    }

  private def punterEndpointWithStatusValidationJwt(
      profileAuthorizer: PunterProfileAuthorizer,
      puntersBoundedContext: PuntersBoundedContext)(implicit
      authenticator: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[Option[String], PunterId, Unit, ErrorOut, Unit, Any, Future] =
    endpointWithError.securityIn(auth.bearer[Option[String]]()).serverSecurityLogic { jwtToken =>
      (for {
        permissions <- verifyJwtToken(jwtToken)
        punterId = PunterId(permissions.userId.value)
        _ <- guardPunterProfileAuthorization(punterId, puntersBoundedContext, profileAuthorizer)
      } yield punterId).value
    }

  def punterEndpoint(implicit
      authenticator: JwtAuthenticator,
      ec: ExecutionContext): PartialServerEndpoint[Option[String], PunterId, Unit, ErrorOut, Unit, Any, Future] =
    endpointWithError.securityIn(auth.bearer[Option[String]]()).serverSecurityLogic {
      verifyJwtToken(_).map(permissions => PunterId(permissions.userId.value)).value
    }

  def basicAuthEndpoint(expectedCredentials: UsernamePassword)
      : PartialServerEndpoint[UsernamePassword, Unit, Unit, ErrorOut, Unit, Any, Future] = {
    endpointWithError.securityIn(auth.basic[UsernamePassword]()).serverSecurityLogic { actualCredentials =>
      Future.successful {
        Either
          .cond(actualCredentials == expectedCredentials, (), unauthorized(PresentationErrorCode.UnauthorizedRequest))
      }
    }
  }

  private def toErrorOut(error: JwtAuthenticationError): ErrorOut =
    error match {
      case JwtAuthenticator.InvalidAuthTokenError(_) =>
        unauthorized(PresentationErrorCode.InvalidAuthToken)
      case JwtAuthenticator.InactiveAuthTokenError =>
        unauthorized(PresentationErrorCode.InactiveAuthToken)
    }
}
