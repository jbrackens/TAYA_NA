package stella.wallet.routes.wallet

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Random

import cats.data.EitherT
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.http.Response
import stella.common.http.error.PresentationErrorCode
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.gen.Generators._
import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.wallet.TransferFundsRequest
import stella.wallet.models.wallet.WalletBalance
import stella.wallet.models.wallet.WalletBalanceInCurrency
import stella.wallet.routes.ResponseFormats._
import stella.wallet.routes.RoutesWithMockedBoundedContextSpecBase
import stella.wallet.routes.SampleObjectFactory._
import stella.wallet.routes.TestConstants.Endpoint._
import stella.wallet.routes.TestConstants._
import stella.wallet.routes.error.AdditionalPresentationErrorCode
import stella.wallet.routes.error.AdditionalPresentationErrorCode.ProjectCurrencyNotFound
import stella.wallet.services.WalletBoundedContext.Errors.GetBalanceError
import stella.wallet.services.WalletBoundedContext.Errors.GetBalancesError
import stella.wallet.services.WalletBoundedContext.Errors.TransferFundsError
import stella.wallet.services.WalletBoundedContext.Errors._
import stella.wallet.services.WalletBoundedContext.WalletPermissions
import stella.wallet.services.WalletBoundedContext.WalletPermissions.BalanceReadPermission

class WalletRoutesWithMockedBoundedContextSpec extends RoutesWithMockedBoundedContextSpecBase {

  private val unexpectedWalletErrorFuture = Future.successful(Left(UnexpectedWalletError("test failure")))
  private val currencyForProjectNotFoundErrorFuture =
    Future.successful(Left(CurrencyAssociatedWithProjectNotFoundError(testProjectId, testCurrencyId)))
  private val failedFuture = Future.failed(new Exception("Kaboom!"))

  "getBalances" should {
    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(BalanceReadPermission)
      val request = FakeRequest(GET, getBalancesEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)
      (boundedContext
        .getBalances(_: ProjectId, _: UserId)(_: ExecutionContext))
        .expects(testProjectId, testSenderUserId, *)
        .returning(EitherT[Future, GetBalancesError, WalletBalance](unexpectedWalletErrorFuture))
        .once()
      testRequestWithInternalServerErrorResponse(request)
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.BalanceReadPermission)
      val request = FakeRequest(GET, getBalancesEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)
      (boundedContext
        .getBalances(_: ProjectId, _: UserId)(_: ExecutionContext))
        .expects(testProjectId, testSenderUserId, *)
        .returning(EitherT[Future, GetBalancesError, WalletBalance](failedFuture))
        .once()
      testRequestWithInternalServerErrorResponse(request)
    }

    "return balance collection" in {
      forAll(walletBalanceGen) { walletBalance =>
        checkExpectedPermission(WalletPermissions.BalanceReadPermission)
        val request = FakeRequest(GET, getBalancesEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)
        (boundedContext
          .getBalances(_: ProjectId, _: UserId)(_: ExecutionContext))
          .expects(testProjectId, testSenderUserId, *)
          .returning(EitherT[Future, GetBalancesError, WalletBalance](Future.successful(Right(walletBalance))))
          .once()
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, OK, expected = Response.asSuccess(walletBalance))
      }
    }
  }

  "getBalanceInCurrency" should {
    val path = getBalanceEndpointPath(testCurrencyId)

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(WalletPermissions.BalanceReadPermission)
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      (boundedContext
        .getBalance(_: ProjectId, _: UserId, _: CurrencyId)(_: ExecutionContext))
        .expects(testProjectId, testSenderUserId, testCurrencyId, *)
        .returning(EitherT[Future, GetBalanceError, WalletBalanceInCurrency](unexpectedWalletErrorFuture))
        .once()
      testRequestWithInternalServerErrorResponse(request)
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.BalanceReadPermission)
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      (boundedContext
        .getBalance(_: ProjectId, _: UserId, _: CurrencyId)(_: ExecutionContext))
        .expects(testProjectId, testSenderUserId, testCurrencyId, *)
        .returning(EitherT[Future, GetBalanceError, WalletBalanceInCurrency](failedFuture))
        .once()
      testRequestWithInternalServerErrorResponse(request)
    }

    "return NotFounds on CurrencyAssociatedWithProjectNotFoundError" in {
      checkExpectedPermission(WalletPermissions.BalanceReadPermission)
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      (boundedContext
        .getBalance(_: ProjectId, _: UserId, _: CurrencyId)(_: ExecutionContext))
        .expects(testProjectId, testSenderUserId, testCurrencyId, *)
        .returning(EitherT[Future, GetBalanceError, WalletBalanceInCurrency](currencyForProjectNotFoundErrorFuture))
        .once()
      testRequestWithErrorResponse(request, None, NOT_FOUND, ProjectCurrencyNotFound)
    }

    "return single balance" in {
      forAll(walletBalanceInCurrencyGen) { walletBalanceInCurrency =>
        checkExpectedPermission(WalletPermissions.BalanceReadPermission)
        val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
        (boundedContext
          .getBalance(_: ProjectId, _: UserId, _: CurrencyId)(_: ExecutionContext))
          .expects(testProjectId, testSenderUserId, testCurrencyId, *)
          .returning(EitherT[Future, GetBalanceError, WalletBalanceInCurrency](
            Future.successful(Right(walletBalanceInCurrency))))
          .once()
        testRequestWithStatusCodeAndExpectedJsonContent(
          app,
          request,
          OK,
          expected = Response.asSuccess(walletBalanceInCurrency))
      }
    }
  }

  "getBalancesAsAdmin" should {
    val path = getBalancesAsAdminEndpointPath(testUserId)

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(WalletPermissions.BalanceAdminReadPermission)
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      (boundedContext
        .getBalances(_: ProjectId, _: UserId)(_: ExecutionContext))
        .expects(testProjectId, testUserId, *)
        .returning(EitherT[Future, GetBalancesError, WalletBalance](unexpectedWalletErrorFuture))
        .once()
      testRequestWithInternalServerErrorResponse(request)
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.BalanceAdminReadPermission)
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      (boundedContext
        .getBalances(_: ProjectId, _: UserId)(_: ExecutionContext))
        .expects(testProjectId, testUserId, *)
        .returning(EitherT[Future, GetBalancesError, WalletBalance](failedFuture))
        .once()
      testRequestWithInternalServerErrorResponse(request)
    }

    "return balance collection" in {
      forAll(walletBalanceGen, userIdGen) { (walletBalance, userId) =>
        val path = getBalancesAsAdminEndpointPath(userId)
        checkExpectedPermission(WalletPermissions.BalanceAdminReadPermission)
        val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
        (boundedContext
          .getBalances(_: ProjectId, _: UserId)(_: ExecutionContext))
          .expects(testProjectId, userId, *)
          .returning(EitherT[Future, GetBalancesError, WalletBalance](Future.successful(Right(walletBalance))))
          .once()
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, OK, expected = Response.asSuccess(walletBalance))
      }
    }
  }

  "getBalanceAsAdmin" should {
    val path = getBalanceAsAdminEndpointPath(testUserId, testCurrencyId)

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(WalletPermissions.BalanceAdminReadPermission)
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      (boundedContext
        .getBalance(_: ProjectId, _: UserId, _: CurrencyId)(_: ExecutionContext))
        .expects(testProjectId, testUserId, testCurrencyId, *)
        .returning(EitherT[Future, GetBalanceError, WalletBalanceInCurrency](unexpectedWalletErrorFuture))
        .once()
      testRequestWithInternalServerErrorResponse(request)
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.BalanceAdminReadPermission)
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      (boundedContext
        .getBalance(_: ProjectId, _: UserId, _: CurrencyId)(_: ExecutionContext))
        .expects(testProjectId, testUserId, testCurrencyId, *)
        .returning(EitherT[Future, GetBalanceError, WalletBalanceInCurrency](failedFuture))
        .once()
      testRequestWithInternalServerErrorResponse(request)
    }

    "return NotFounds on CurrencyAssociatedWithProjectNotFoundError" in {
      checkExpectedPermission(WalletPermissions.BalanceAdminReadPermission)
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      (boundedContext
        .getBalance(_: ProjectId, _: UserId, _: CurrencyId)(_: ExecutionContext))
        .expects(testProjectId, testUserId, testCurrencyId, *)
        .returning(EitherT[Future, GetBalanceError, WalletBalanceInCurrency](currencyForProjectNotFoundErrorFuture))
        .once()
      testRequestWithErrorResponse(request, None, NOT_FOUND, AdditionalPresentationErrorCode.ProjectCurrencyNotFound)
    }

    "return single balance" in {
      forAll(walletBalanceInCurrencyGen) { walletBalanceInCurrency =>
        checkExpectedPermission(WalletPermissions.BalanceAdminReadPermission)
        val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
        (boundedContext
          .getBalance(_: ProjectId, _: UserId, _: CurrencyId)(_: ExecutionContext))
          .expects(testProjectId, testUserId, testCurrencyId, *)
          .returning(EitherT[Future, GetBalanceError, WalletBalanceInCurrency](
            Future.successful(Right(walletBalanceInCurrency))))
          .once()
        testRequestWithStatusCodeAndExpectedJsonContent(
          app,
          request,
          OK,
          expected = Response.asSuccess(walletBalanceInCurrency))
      }
    }
  }

  "transferFundsAsAdmin" should {
    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.TransactionAdminWritePermission)
      val request = FakeRequest(
        POST,
        transferFundsAsAdminEndpointPath(testProjectId, testUserId),
        headersWithFakeJwt,
        AnyContentAsJson(transferFundsRequestJson))
      (boundedContext
        .transferFunds(_: ProjectId, _: UserId, _: UserId, _: TransferFundsRequest)(_: ExecutionContext))
        .expects(testProjectId, testSenderUserId, testUserId, transferFundsRequest, *)
        .returning(EitherT[Future, TransferFundsError, Unit](unexpectedWalletErrorFuture))
        .once()
      testRequestWithInternalServerErrorResponse(request)
    }

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(WalletPermissions.TransactionAdminWritePermission)
      val request = FakeRequest(
        POST,
        transferFundsAsAdminEndpointPath(testProjectId, testUserId),
        headersWithFakeJwt,
        AnyContentAsJson(transferFundsRequestJson))
      (boundedContext
        .transferFunds(_: ProjectId, _: UserId, _: UserId, _: TransferFundsRequest)(_: ExecutionContext))
        .expects(testProjectId, testSenderUserId, testUserId, transferFundsRequest, *)
        .returning(EitherT[Future, TransferFundsError, Unit](failedFuture))
        .once()
      testRequestWithInternalServerErrorResponse(request)
    }

    "return NotFound on CurrencyAssociatedWithProjectNotFoundError" in {
      checkExpectedPermission(WalletPermissions.TransactionAdminWritePermission)
      val request = FakeRequest(
        POST,
        transferFundsAsAdminEndpointPath(testProjectId, testUserId),
        headersWithFakeJwt,
        AnyContentAsJson(transferFundsRequestJson))
      (boundedContext
        .transferFunds(_: ProjectId, _: UserId, _: UserId, _: TransferFundsRequest)(_: ExecutionContext))
        .expects(testProjectId, testSenderUserId, testUserId, transferFundsRequest, *)
        .returning(EitherT[Future, TransferFundsError, Unit](currencyForProjectNotFoundErrorFuture))
        .once()
      testRequestWithErrorResponse(request, None, NOT_FOUND, AdditionalPresentationErrorCode.ProjectCurrencyNotFound)
    }

    "return Conflict on InsufficientFundsError" in {
      checkExpectedPermission(WalletPermissions.TransactionAdminWritePermission)
      val request = FakeRequest(
        POST,
        transferFundsAsAdminEndpointPath(testProjectId, testUserId),
        headersWithFakeJwt,
        AnyContentAsJson(transferFundsRequestJson))
      (boundedContext
        .transferFunds(_: ProjectId, _: UserId, _: UserId, _: TransferFundsRequest)(_: ExecutionContext))
        .expects(testProjectId, testSenderUserId, testUserId, transferFundsRequest, *)
        .returning(EitherT[Future, TransferFundsError, Unit](
          Future.successful(Left(InsufficientFundsError(testUserId, testCurrencyId)))))
        .once()
      testRequestWithErrorResponse(request, None, CONFLICT, AdditionalPresentationErrorCode.InsufficientFunds)
    }

    "return BadRequest on empty externalTransactionId" in {
      testTransferFundsWithWrongExternalTransactionId(wrongExternalTransactionId = "")
    }

    "return BadRequest on blank externalTransactionId" in {
      testTransferFundsWithWrongExternalTransactionId(wrongExternalTransactionId = " \t ")
    }

    "return BadRequest on too long externalTransactionId" in {
      val wrongExternalTransactionId = Random.nextString(maxExternalTransactionIdLength + 1)
      testTransferFundsWithWrongExternalTransactionId(wrongExternalTransactionId)
    }

    "return BadRequest on empty title" in {
      testTransferFundsWithWrongTitle(wrongTitle = "")
    }

    "return BadRequest on blank title" in {
      testTransferFundsWithWrongTitle(wrongTitle = " \t ")
    }

    "return BadRequest on too long title" in {
      val wrongTitle = Random.nextString(maxTitleLength + 1)
      testTransferFundsWithWrongTitle(wrongTitle)
    }

    "return BadRequest when amount is not positive number" in {
      checkExpectedPermission(WalletPermissions.TransactionAdminWritePermission)
      val request =
        FakeRequest(
          POST,
          transferFundsAsAdminEndpointPath(testProjectId, testUserId),
          headersWithFakeJwt,
          AnyContentAsJson(jsonWithChangedStringField(transferFundsRequestJson, amountFieldName, "-1")))
      testRequestWithBadRequestResponse(
        request,
        "Invalid value for: body (requirement failed: Expected positive number)")
    }

    "return Forbidden when the projectId is not in the list of the admin projects" in {
      checkExpectedPermission(WalletPermissions.TransactionAdminWritePermission)
      val request =
        FakeRequest(
          POST,
          transferFundsAsAdminEndpointPath(ProjectId.random(), testUserId),
          headersWithFakeJwt,
          AnyContentAsJson(jsonWithChangedStringField(transferFundsRequestJson, amountFieldName, "1")))

      testRequestWithErrorResponse(request, None, FORBIDDEN, PresentationErrorCode.Forbidden)
    }

    "succeed in case of success in bounded context" in {
      forAll(transferFundsRequestGen) { requestData =>
        checkExpectedPermission(WalletPermissions.TransactionAdminWritePermission)
        val json = TransferFundsRequest.transferFundsRequestPlayFormat.writes(requestData)
        val request =
          FakeRequest(
            POST,
            transferFundsAsAdminEndpointPath(testProjectId, testUserId),
            headersWithFakeJwt,
            AnyContentAsJson(json))
        (boundedContext
          .transferFunds(_: ProjectId, _: UserId, _: UserId, _: TransferFundsRequest)(_: ExecutionContext))
          .expects(testProjectId, testSenderUserId, testUserId, requestData, *)
          .returning(EitherT[Future, TransferFundsError, Unit](Future.successful(Right(()))))
          .once()
        testRequestWithStatusCodeAndEmptyResponse(request, OK)
      }
    }
  }

  private def testTransferFundsWithWrongExternalTransactionId(wrongExternalTransactionId: String) = {
    checkExpectedPermission(WalletPermissions.TransactionAdminWritePermission)
    val request =
      FakeRequest(
        POST,
        transferFundsAsAdminEndpointPath(testProjectId, testUserId),
        headersWithFakeJwt,
        AnyContentAsJson(
          jsonWithChangedStringField(
            transferFundsRequestJson,
            externalTransactionIdFieldName,
            wrongExternalTransactionId)))
    testRequestWithBadRequestResponse(request, wrongExternalTransactionIdFieldErrorMessage(wrongExternalTransactionId))
  }

  private def testTransferFundsWithWrongTitle(wrongTitle: String) = {
    checkExpectedPermission(WalletPermissions.TransactionAdminWritePermission)
    val request =
      FakeRequest(
        POST,
        transferFundsAsAdminEndpointPath(testProjectId, testUserId),
        headersWithFakeJwt,
        AnyContentAsJson(jsonWithChangedStringField(transferFundsRequestJson, titleFieldName, wrongTitle)))
    testRequestWithBadRequestResponse(request, wrongTitleFieldErrorMessage(wrongTitle))
  }

  private def wrongExternalTransactionIdFieldErrorMessage(wrongExternalTransactionId: String) =
    s"Invalid value for: body (requirement failed: '$externalTransactionIdFieldName' must be non-empty, non-blank and not " +
    s"longer than $maxExternalTransactionIdLength characters, but it was '$wrongExternalTransactionId')"

  private def wrongTitleFieldErrorMessage(wrongTitle: String) =
    s"Invalid value for: body (requirement failed: '$titleFieldName' must be non-empty, non-blank and not " +
    s"longer than $maxTitleLength characters, but it was '$wrongTitle')"
}
