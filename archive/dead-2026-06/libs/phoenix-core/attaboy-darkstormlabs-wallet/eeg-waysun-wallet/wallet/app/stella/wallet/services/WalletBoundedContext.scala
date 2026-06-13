package stella.wallet.services

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import stella.common.http.jwt.Permission
import stella.common.models.Ids._

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.currency._
import stella.wallet.models.transaction.Transaction
import stella.wallet.models.transaction.TransactionType
import stella.wallet.models.wallet.TransferFundsRequest
import stella.wallet.models.wallet.WalletBalance
import stella.wallet.models.wallet.WalletBalanceInCurrency
import stella.wallet.services.WalletBoundedContext.Errors._

trait WalletBoundedContext {
  def getCurrenciesAssociatedWithProject(projectId: ProjectId)(implicit ec: ExecutionContext): Future[Seq[Currency]]

  def getAllCurrencies()(implicit ec: ExecutionContext): Future[Seq[Currency]]

  def getCurrency(currencyId: CurrencyId)(implicit ec: ExecutionContext): EitherT[Future, GetCurrencyError, Currency]

  def getCurrencyAssociatedWithProject(projectId: ProjectId, currencyId: CurrencyId)(implicit
      ec: ExecutionContext): EitherT[Future, GetCurrencyAssociatedWithProjectError, Currency]

  def createCurrencyWithAssociatedProjects(
      request: CreateCurrencyWithAssociatedProjectsRequest,
      userProjectId: ProjectId,
      userId: UserId,
      restrictedToProjectIds: Option[Set[ProjectId]])(implicit ec: ExecutionContext): Future[Currency]

  def updateCurrencyWithAssociatedProjects(
      currencyId: CurrencyId,
      request: UpdateCurrencyWithAssociatedProjectsRequest,
      userProjectId: ProjectId,
      userId: UserId,
      restrictedToProjectIds: Option[Set[ProjectId]])(implicit
      ec: ExecutionContext): EitherT[Future, UpdateCurrencyError, Currency]

  def deleteCurrencyProjectAssociation(projectId: ProjectId, currencyId: CurrencyId, userId: UserId)(implicit
      ec: ExecutionContext): EitherT[Future, DeleteCurrencyProjectAssociationError, Unit]

  def getBalance(projectId: ProjectId, userId: UserId, currencyId: CurrencyId)(implicit
      ec: ExecutionContext): EitherT[Future, GetBalanceError, WalletBalanceInCurrency]

  def getBalances(projectId: ProjectId, userId: UserId)(implicit
      ec: ExecutionContext): EitherT[Future, GetBalancesError, WalletBalance]

  def transferFunds(projectId: ProjectId, requesterId: UserId, walletOwnerId: UserId, request: TransferFundsRequest)(
      implicit ec: ExecutionContext): EitherT[Future, TransferFundsError, Unit]

  def getTransactionHistory(
      projectId: ProjectId,
      walletOwnerId: UserId,
      currencyId: CurrencyId,
      transactionTypes: Set[TransactionType],
      dateRangeStart: Option[OffsetDateTime],
      dateRangeEnd: Option[OffsetDateTime],
      sortFromNewestToOldest: Boolean)(implicit
      ec: ExecutionContext): EitherT[Future, GetTransactionHistoryError, Seq[Transaction]]
}

object WalletBoundedContext {

  object Errors {
    sealed trait GetCurrencyError
    sealed trait GetCurrencyAssociatedWithProjectError
    sealed trait DeleteCurrencyProjectAssociationError
    sealed trait UpdateProjectCurrencyError
    sealed trait UpdateCurrencyError

    sealed trait GetBalancesError
    sealed trait GetBalanceError
    sealed trait TransferFundsError

    sealed trait GetTransactionHistoryError

    final case class CurrencyNotFoundError(currencyId: CurrencyId) extends GetCurrencyError with UpdateCurrencyError {
      def errorMessage: String = s"Couldn't find currency $currencyId"
    }

    final case class CurrencyAssociatedWithProjectNotFoundError(projectId: ProjectId, currencyId: CurrencyId)
        extends GetCurrencyAssociatedWithProjectError
        with UpdateProjectCurrencyError
        with DeleteCurrencyProjectAssociationError
        with TransferFundsError
        with GetBalanceError
        with GetTransactionHistoryError {
      def errorMessage: String = s"Couldn't find currency $currencyId associated with $projectId"
    }

    final case class InsufficientFundsError(walletOwnerId: UserId, currencyId: CurrencyId) extends TransferFundsError {
      def errorMessage: String =
        s"User $walletOwnerId has not enough funds in currency $currencyId to process operation"
    }

    final case class UnexpectedWalletError private (details: String, underlying: Option[Throwable])
        extends GetBalanceError
        with GetBalancesError
        with TransferFundsError

    object UnexpectedWalletError {
      def apply(details: String): UnexpectedWalletError =
        UnexpectedWalletError(details, None)

      def apply(details: String, underlying: Throwable): UnexpectedWalletError =
        UnexpectedWalletError(details, Some(underlying))
    }
  }

  object WalletPermissions {
    object BalanceAdminReadPermission extends Permission {
      override val value: String = "wallet:admin:balance:read"
    }

    object BalanceReadPermission extends Permission {
      override val value: String = "wallet:balance:read"
    }

    object CurrencyAdminWritePermission extends Permission {
      override val value: String = "wallet:admin:currency:write"
    }

    object CurrencyAdminReadPermission extends Permission {
      override val value: String = "wallet:admin:currency:read"
    }

    object CurrencySuperAdminWritePermission extends Permission {
      override val value: String = "wallet:superadmin:currency:write"
    }

    object CurrencySuperAdminReadPermission extends Permission {
      override val value: String = "wallet:superadmin:currency:read"
    }

    object CurrencyReadPermission extends Permission {
      override val value: String = "wallet:currency:read"
    }

    object TransactionAdminWritePermission extends Permission {
      override val value: String = "wallet:admin:transaction:write"
    }

    object TransactionAdminReadPermission extends Permission {
      override val value: String = "wallet:admin:transaction:read"
    }

    object TransactionReadPermission extends Permission {
      override val value: String = "wallet:transaction:read"
    }
  }
}
