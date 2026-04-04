package stella.wallet.routes.transaction

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalacheck.Arbitrary
import org.scalacheck.Gen
import play.api.mvc.AnyContentAsEmpty
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.http.Response
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.gen.Generators._
import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.transaction.Transaction
import stella.wallet.models.transaction.TransactionType
import stella.wallet.routes.ResponseFormats._
import stella.wallet.routes.RoutesWithMockedBoundedContextSpecBase
import stella.wallet.routes.SampleObjectFactory._
import stella.wallet.routes.TestConstants.Endpoint._
import stella.wallet.routes.error.AdditionalPresentationErrorCode
import stella.wallet.services.WalletBoundedContext.Errors._
import stella.wallet.services.WalletBoundedContext.WalletPermissions

class TransactionRoutesWithMockedBoundedContextSpec extends RoutesWithMockedBoundedContextSpecBase {

  private val currencyForProjectNotFoundErrorFuture =
    Future.successful(Left(CurrencyAssociatedWithProjectNotFoundError(testProjectId, testCurrencyId)))
  private val failedFuture = Future.failed(new Exception("Kaboom!"))

  "getTransactionHistory" should {
    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.TransactionReadPermission)
      (boundedContext
        .getTransactionHistory(
          _: ProjectId,
          _: UserId,
          _: CurrencyId,
          _: Set[TransactionType],
          _: Option[OffsetDateTime],
          _: Option[OffsetDateTime],
          _: Boolean)(_: ExecutionContext))
        .expects(testProjectId, testSenderUserId, testCurrencyId, Set.empty[TransactionType], None, None, true, *)
        .returning(EitherT[Future, GetTransactionHistoryError, Seq[Transaction]](failedFuture))
        .once()
      val request =
        FakeRequest(GET, getTransactionHistoryEndpointPath(testCurrencyId), headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }

    "return NotFound when currencies could not be found" in {
      checkExpectedPermission(WalletPermissions.TransactionReadPermission)
      (boundedContext
        .getTransactionHistory(
          _: ProjectId,
          _: UserId,
          _: CurrencyId,
          _: Set[TransactionType],
          _: Option[OffsetDateTime],
          _: Option[OffsetDateTime],
          _: Boolean)(_: ExecutionContext))
        .expects(testProjectId, testSenderUserId, testCurrencyId, Set.empty[TransactionType], None, None, true, *)
        .returning(EitherT[Future, GetTransactionHistoryError, Seq[Transaction]](currencyForProjectNotFoundErrorFuture))
        .once()
      val request =
        FakeRequest(GET, getTransactionHistoryEndpointPath(testCurrencyId), headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithErrorResponse(request, None, NOT_FOUND, AdditionalPresentationErrorCode.ProjectCurrencyNotFound)
    }

    "return transactions" in {
      forAll(
        Gen.listOfN(5, transactionGen),
        currencyIdGen,
        Gen.listOfN(5, transactionTypeGen).map(_.toSet),
        Gen.option(offsetDateTimeGen),
        Gen.option(offsetDateTimeGen),
        Gen.option(Arbitrary.arbBool.arbitrary)) {
        case (transactions, currencyId, transactionTypes, dateRangeStart, dateRangeEnd, sortFromNewestToOldest) =>
          checkExpectedPermission(WalletPermissions.TransactionReadPermission)
          val newestToOldest = sortFromNewestToOldest.getOrElse(true)
          (boundedContext
            .getTransactionHistory(
              _: ProjectId,
              _: UserId,
              _: CurrencyId,
              _: Set[TransactionType],
              _: Option[OffsetDateTime],
              _: Option[OffsetDateTime],
              _: Boolean)(_: ExecutionContext))
            .expects(
              testProjectId,
              testSenderUserId,
              currencyId,
              transactionTypes,
              dateRangeStart,
              dateRangeEnd,
              newestToOldest,
              *)
            .returning(
              EitherT[Future, GetTransactionHistoryError, Seq[Transaction]](Future.successful(Right(transactions))))
            .once()
          val path = getTransactionHistoryEndpointPath(
            currencyId,
            transactionTypes,
            dateRangeStart,
            dateRangeEnd,
            sortFromNewestToOldest)
          val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
          testRequestWithStatusCodeAndExpectedJsonContent(
            app,
            request,
            OK,
            expected = Response.asSuccess(transactions: Seq[Transaction]))
      }
    }
  }

  "getTransactionHistoryAsAdmin" should {
    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.TransactionAdminReadPermission)
      (boundedContext
        .getTransactionHistory(
          _: ProjectId,
          _: UserId,
          _: CurrencyId,
          _: Set[TransactionType],
          _: Option[OffsetDateTime],
          _: Option[OffsetDateTime],
          _: Boolean)(_: ExecutionContext))
        .expects(testProjectId, testUserId, testCurrencyId, Set.empty[TransactionType], None, None, true, *)
        .returning(EitherT[Future, GetTransactionHistoryError, Seq[Transaction]](failedFuture))
        .once()
      val request =
        FakeRequest(
          GET,
          getTransactionHistoryAsAdminEndpointPath(testUserId, testCurrencyId),
          headersWithFakeJwt,
          AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }

    "return NotFound when currencies could not be found" in {
      checkExpectedPermission(WalletPermissions.TransactionAdminReadPermission)
      (boundedContext
        .getTransactionHistory(
          _: ProjectId,
          _: UserId,
          _: CurrencyId,
          _: Set[TransactionType],
          _: Option[OffsetDateTime],
          _: Option[OffsetDateTime],
          _: Boolean)(_: ExecutionContext))
        .expects(testProjectId, testUserId, testCurrencyId, Set.empty[TransactionType], None, None, true, *)
        .returning(EitherT[Future, GetTransactionHistoryError, Seq[Transaction]](currencyForProjectNotFoundErrorFuture))
        .once()
      val request =
        FakeRequest(
          GET,
          getTransactionHistoryAsAdminEndpointPath(testUserId, testCurrencyId),
          headersWithFakeJwt,
          AnyContentAsEmpty)
      testRequestWithErrorResponse(request, None, NOT_FOUND, AdditionalPresentationErrorCode.ProjectCurrencyNotFound)
    }

    "return transactions" in {
      forAll(
        Gen.listOfN(5, transactionGen),
        currencyIdGen,
        Gen.listOfN(5, transactionTypeGen).map(_.toSet),
        Gen.option(offsetDateTimeGen),
        Gen.option(offsetDateTimeGen),
        Gen.option(Arbitrary.arbBool.arbitrary)) {
        case (
              transactions: Seq[Transaction],
              currencyId,
              transactionTypes,
              dateRangeStart,
              dateRangeEnd,
              sortFromNewestToOldest) =>
          checkExpectedPermission(WalletPermissions.TransactionAdminReadPermission)
          val newestToOldest = sortFromNewestToOldest.getOrElse(true)
          (boundedContext
            .getTransactionHistory(
              _: ProjectId,
              _: UserId,
              _: CurrencyId,
              _: Set[TransactionType],
              _: Option[OffsetDateTime],
              _: Option[OffsetDateTime],
              _: Boolean)(_: ExecutionContext))
            .expects(
              testProjectId,
              testUserId,
              currencyId,
              transactionTypes,
              dateRangeStart,
              dateRangeEnd,
              newestToOldest,
              *)
            .returning(
              EitherT[Future, GetTransactionHistoryError, Seq[Transaction]](Future.successful(Right(transactions))))
            .once()
          val path = getTransactionHistoryAsAdminEndpointPath(
            testUserId,
            currencyId,
            transactionTypes,
            dateRangeStart,
            dateRangeEnd,
            sortFromNewestToOldest)
          val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
          testRequestWithStatusCodeAndExpectedJsonContent(
            app,
            request,
            OK,
            expected = Response.asSuccess(transactions: Seq[Transaction]))
      }
    }
  }
}
