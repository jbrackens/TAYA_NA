package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.data.OptionT
import cats.syntax.bifunctor._
import cats.syntax.either._

import phoenix.core.currency.MoneyAmount
import phoenix.core.pagination.Pagination
import phoenix.payments.application.DepositPreconditions.DepositLimitsExceeded
import phoenix.payments.application.DepositPreconditions.MissingPunterProfile
import phoenix.payments.application.DepositPreconditions.MissingWallet
import phoenix.payments.application.DepositPreconditions.NotAllowedToDeposit
import phoenix.payments.application.DepositPreconditions.TooSmallDeposit
import phoenix.payments.application.VerifyPunterForCashDeposit._
import phoenix.payments.domain._
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.SocialSecurityNumberOps.FullOrPartialSSNConverters
import phoenix.punters.domain._
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletsBoundedContext

private[payments] final class VerifyPunterForCashDeposit(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    puntersRepository: PuntersRepository,
    uUIDGenerator: UUIDGenerator)(implicit ec: ExecutionContext) {

  private val preconditions = new DepositPreconditions(punters, wallets)

  def verify(request: CashDepositVerificationRequest)
      : EitherT[Future, VerifyPunterForCashDepositError, CashDepositVerificationResponse] =
    for {
      punter <- findRegisteredUser(request)
      response <- createResponse(punter)
    } yield response

  private def findRegisteredUser(
      request: CashDepositVerificationRequest): EitherT[Future, VerifyPunterForCashDepositError, Punter] =
    request match {
      case EmailCashDepositVerification(email) =>
        OptionT(findRegisteredUserFromEmail(email)).toRight(UserNotFound).leftWiden[VerifyPunterForCashDepositError]
      case UsernameCashDepositVerification(username) =>
        OptionT(findRegisteredUserFromUsername(username))
          .toRight(UserNotFound)
          .leftWiden[VerifyPunterForCashDepositError]
      case UsernameAndEmailCashDepositVerification(username, email) =>
        findRegisteredUserFromUsernameAndEmail(username, email)
    }

  private def findRegisteredUserFromUsernameAndEmail(
      username: Username,
      email: Email): EitherT[Future, VerifyPunterForCashDepositError, Punter] = {
    EitherT(for {
      userFromUsername <- findRegisteredUserFromUsername(username)
      userFromEmail <- findRegisteredUserFromEmail(email)
    } yield (userFromUsername, userFromEmail) match {
      case (Some(fromUsername), Some(fromEmail)) if fromUsername.punterId == fromEmail.punterId => fromUsername.asRight
      case (Some(_), Some(_))                                                                   => MultipleUsersFound.asLeft
      case (Some(fromUsername), None)                                                           => fromUsername.asRight
      case (None, Some(fromEmail))                                                              => fromEmail.asRight
      case (None, None)                                                                         => UserNotFound.asLeft
    })
  }

  private def findRegisteredUserFromEmail(email: Email): Future[Option[Punter]] =
    punterSearchForFirstRecord(PunterSearch(email = Some(email)))

  private def findRegisteredUserFromUsername(username: Username): Future[Option[Punter]] =
    punterSearchForFirstRecord(PunterSearch(username = Some(username)))

  private def punterSearchForFirstRecord(ps: PunterSearch): Future[Option[Punter]] =
    puntersRepository.findPuntersByFilters(ps, Pagination(1, 1)).map(_.data.headOption)

  private def createResponse(
      registeredUser: Punter): EitherT[Future, VerifyPunterForCashDepositError, CashDepositVerificationResponse] = {
    val punterId = registeredUser.punterId
    getMaxDepositAmount(punterId).map(
      maxDepositAmount =>
        CashDepositVerificationSuccessResponse(
          punterId,
          TransactionId(uUIDGenerator.generate()),
          registeredUser.details,
          PaymentLimits(MoneyAmount(1), maxDepositAmount),
          registeredUser.ssn.toLast4Digits))
  }

  private def getMaxDepositAmount(punterId: PunterId): EitherT[Future, VerifyPunterForCashDepositError, MoneyAmount] =
    preconditions.getMaxDepositAmount(punterId).leftMap {
      case MissingPunterProfile(_)                                                => PunterNotFound
      case MissingWallet(_)                                                       => WalletNotFound
      case NotAllowedToDeposit(_) | DepositLimitsExceeded(_) | TooSmallDeposit(_) => PunterNotAllowedToDeposit
    }
}

private[payments] object VerifyPunterForCashDeposit {
  sealed trait VerifyPunterForCashDepositError
  final case object PunterNotAllowedToDeposit extends VerifyPunterForCashDepositError
  final case object UserNotFound extends VerifyPunterForCashDepositError
  final case object MultipleUsersFound extends VerifyPunterForCashDepositError
  final case object PunterNotFound extends VerifyPunterForCashDepositError
  final case object WalletNotFound extends VerifyPunterForCashDepositError
}
