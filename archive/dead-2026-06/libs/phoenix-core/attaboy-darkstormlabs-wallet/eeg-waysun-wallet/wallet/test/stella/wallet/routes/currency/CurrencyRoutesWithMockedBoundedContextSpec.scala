package stella.wallet.routes.currency

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Random

import cats.data.EitherT
import org.scalatest.Assertion
import play.api.libs.json.JsObject
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
import stella.wallet.models.currency._
import stella.wallet.routes.ResponseFormats._
import stella.wallet.routes.RoutesWithMockedBoundedContextSpecBase
import stella.wallet.routes.SampleObjectFactory._
import stella.wallet.routes.TestConstants.Endpoint._
import stella.wallet.routes.TestConstants._
import stella.wallet.routes.error.AdditionalPresentationErrorCode
import stella.wallet.services.WalletBoundedContext.Errors._
import stella.wallet.services.WalletBoundedContext.WalletPermissions

class CurrencyRoutesWithMockedBoundedContextSpec extends RoutesWithMockedBoundedContextSpecBase {
  private val failedFuture: Future[Nothing] = Future.failed(new Exception("Kaboom!"))

  "getCurrencies" should {
    "return currencies" in {
      forAll(currenciesSeqGen) { currencies =>
        checkExpectedPermission(WalletPermissions.CurrencyReadPermission)
        (boundedContext
          .getCurrenciesAssociatedWithProject(_: ProjectId)(_: ExecutionContext))
          .expects(testProjectId, *)
          .returning(Future.successful(currencies))
          .once()
        val request = FakeRequest(GET, getCurrenciesEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, OK, expected = Response.asSuccess(currencies))
      }
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.CurrencyReadPermission)
      (boundedContext
        .getCurrenciesAssociatedWithProject(_: ProjectId)(_: ExecutionContext))
        .expects(testProjectId, *)
        .returning(failedFuture)
        .once()
      val request = FakeRequest(GET, getCurrenciesEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }
  }

  "getCurrency" should {
    "return currency" in {
      forAll(currencyGen) { currency =>
        checkExpectedPermission(WalletPermissions.CurrencyReadPermission)
        (boundedContext
          .getCurrencyAssociatedWithProject(_: ProjectId, _: CurrencyId)(_: ExecutionContext))
          .expects(testProjectId, testCurrencyId, *)
          .returning(
            EitherT[Future, GetCurrencyAssociatedWithProjectError, Currency](Future.successful(Right(currency))))
          .once()
        val request = FakeRequest(GET, getCurrencyEndpointPath(testCurrencyId), headersWithFakeJwt, AnyContentAsEmpty)
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, OK, expected = Response.asSuccess(currency))
      }
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.CurrencyReadPermission)
      (boundedContext
        .getCurrencyAssociatedWithProject(_: ProjectId, _: CurrencyId)(_: ExecutionContext))
        .expects(testProjectId, testCurrencyId, *)
        .returning(EitherT[Future, GetCurrencyAssociatedWithProjectError, Currency](failedFuture))
        .once()
      val request = FakeRequest(GET, getCurrencyEndpointPath(testCurrencyId), headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }

    "return NotFound when currency could not be found" in {
      checkExpectedPermission(WalletPermissions.CurrencyReadPermission)
      (boundedContext
        .getCurrencyAssociatedWithProject(_: ProjectId, _: CurrencyId)(_: ExecutionContext))
        .expects(testProjectId, testCurrencyId, *)
        .returning(EitherT[Future, GetCurrencyAssociatedWithProjectError, Currency](
          Future.successful(Left(CurrencyAssociatedWithProjectNotFoundError(testProjectId, testCurrencyId)))))
        .once()
      val request =
        FakeRequest(GET, getCurrencyEndpointPath(testCurrencyId), headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithErrorResponse(request, None, NOT_FOUND, AdditionalPresentationErrorCode.ProjectCurrencyNotFound)
    }
  }

  "getCurrenciesAsAdmin" should {
    "return currencies" in {
      forAll(currenciesSeqGen) { currencies =>
        checkExpectedPermission(WalletPermissions.CurrencyAdminReadPermission)
        (boundedContext
          .getCurrenciesAssociatedWithProject(_: ProjectId)(_: ExecutionContext))
          .expects(testProjectId, *)
          .returning(Future.successful(currencies))
          .once()
        val request = FakeRequest(GET, getCurrenciesAsAdminEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, OK, expected = Response.asSuccess(currencies))
      }
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.CurrencyAdminReadPermission)
      (boundedContext
        .getCurrenciesAssociatedWithProject(_: ProjectId)(_: ExecutionContext))
        .expects(testProjectId, *)
        .returning(failedFuture)
        .once()
      val request = FakeRequest(GET, getCurrenciesAsAdminEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }
  }

  "getCurrencyAsAdmin" should {
    "return currency" in {
      forAll(currencyGen) { currency =>
        checkExpectedPermission(WalletPermissions.CurrencyAdminReadPermission)
        (boundedContext
          .getCurrencyAssociatedWithProject(_: ProjectId, _: CurrencyId)(_: ExecutionContext))
          .expects(testProjectId, testCurrencyId, *)
          .returning(
            EitherT[Future, GetCurrencyAssociatedWithProjectError, Currency](Future.successful(Right(currency))))
          .once()
        val request =
          FakeRequest(GET, getCurrencyAsAdminEndpointPath(testCurrencyId), headersWithFakeJwt, AnyContentAsEmpty)
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, OK, expected = Response.asSuccess(currency))
      }
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.CurrencyAdminReadPermission)
      (boundedContext
        .getCurrencyAssociatedWithProject(_: ProjectId, _: CurrencyId)(_: ExecutionContext))
        .expects(testProjectId, testCurrencyId, *)
        .returning(EitherT[Future, GetCurrencyAssociatedWithProjectError, Currency](failedFuture))
        .once()
      val request =
        FakeRequest(GET, getCurrencyAsAdminEndpointPath(testCurrencyId), headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }

    "return NotFound when currency could not be found" in {
      checkExpectedPermission(WalletPermissions.CurrencyAdminReadPermission)
      (boundedContext
        .getCurrencyAssociatedWithProject(_: ProjectId, _: CurrencyId)(_: ExecutionContext))
        .expects(testProjectId, testCurrencyId, *)
        .returning(EitherT[Future, GetCurrencyAssociatedWithProjectError, Currency](
          Future.successful(Left(CurrencyAssociatedWithProjectNotFoundError(testProjectId, testCurrencyId)))))
        .once()
      val request =
        FakeRequest(GET, getCurrencyAsAdminEndpointPath(testCurrencyId), headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithErrorResponse(request, None, NOT_FOUND, AdditionalPresentationErrorCode.ProjectCurrencyNotFound)
    }
  }

  "getCurrenciesAsSuperAdmin" should {
    "return all currencies" in {
      forAll(currenciesSeqGen) { currencies =>
        checkExpectedPermission(WalletPermissions.CurrencySuperAdminReadPermission)
        (boundedContext
          .getAllCurrencies()(_: ExecutionContext))
          .expects(*)
          .returning(Future.successful(currencies))
          .once()
        val request =
          FakeRequest(GET, getCurrenciesAsSuperAdminEndpointPath(), headersWithFakeJwt, AnyContentAsEmpty)
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, OK, expected = Response.asSuccess(currencies))
      }
    }

    "return project currencies" in {
      forAll(currenciesSeqGen) { currencies =>
        val projectId = ProjectId.random()
        checkExpectedPermission(WalletPermissions.CurrencySuperAdminReadPermission)
        (boundedContext
          .getCurrenciesAssociatedWithProject(_: ProjectId)(_: ExecutionContext))
          .expects(projectId, *)
          .returning(Future.successful(currencies))
          .once()
        val request =
          FakeRequest(
            GET,
            getCurrenciesAsSuperAdminEndpointPath(Some(projectId)),
            headersWithFakeJwt,
            AnyContentAsEmpty)
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, OK, expected = Response.asSuccess(currencies))
      }
    }

    "return InternalServerError on unexpected Future error for all currencies" in {
      checkExpectedPermission(WalletPermissions.CurrencySuperAdminReadPermission)
      (boundedContext.getAllCurrencies()(_: ExecutionContext)).expects(*).returning(failedFuture).once()
      val request =
        FakeRequest(GET, getCurrenciesAsSuperAdminEndpointPath(), headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }

    "return InternalServerError on unexpected Future error for project currencies" in {
      checkExpectedPermission(WalletPermissions.CurrencySuperAdminReadPermission)
      val projectId = ProjectId.random()
      (boundedContext
        .getCurrenciesAssociatedWithProject(_: ProjectId)(_: ExecutionContext))
        .expects(projectId, *)
        .returning(failedFuture)
        .once()
      val request =
        FakeRequest(GET, getCurrenciesAsSuperAdminEndpointPath(Some(projectId)), headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }
  }

  "getCurrencyAsSuperAdmin" should {
    "return currency" in {
      forAll(currencyGen) { currency =>
        checkExpectedPermission(WalletPermissions.CurrencySuperAdminReadPermission)
        (boundedContext
          .getCurrency(_: CurrencyId)(_: ExecutionContext))
          .expects(testCurrencyId, *)
          .returning(EitherT[Future, GetCurrencyError, Currency](Future.successful(Right(currency))))
          .once()
        val request =
          FakeRequest(GET, getCurrencyAsSuperAdminEndpointPath(testCurrencyId), headersWithFakeJwt, AnyContentAsEmpty)
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, OK, expected = Response.asSuccess(currency))
      }
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.CurrencySuperAdminReadPermission)
      (boundedContext
        .getCurrency(_: CurrencyId)(_: ExecutionContext))
        .expects(testCurrencyId, *)
        .returning(EitherT[Future, GetCurrencyError, Currency](failedFuture))
        .once()
      val request =
        FakeRequest(GET, getCurrencyAsSuperAdminEndpointPath(testCurrencyId), headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }

    "return NotFound when currency could not be found" in {
      checkExpectedPermission(WalletPermissions.CurrencySuperAdminReadPermission)
      (boundedContext
        .getCurrency(_: CurrencyId)(_: ExecutionContext))
        .expects(testCurrencyId, *)
        .returning(
          EitherT[Future, GetCurrencyError, Currency](Future.successful(Left(CurrencyNotFoundError(testCurrencyId)))))
        .once()
      val request =
        FakeRequest(GET, getCurrencyAsSuperAdminEndpointPath(testCurrencyId), headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithErrorResponse(request, None, NOT_FOUND, AdditionalPresentationErrorCode.CurrencyNotFound)
    }
  }

  "createCurrencyAsAdmin" should {
    "return created currency" in {
      forAll(currencyGen) { currency =>
        val requestData =
          CreateCurrencyWithAssociatedProjectsRequest(
            currency.name,
            currency.verboseName,
            currency.symbol,
            List(testProjectId, testAdditionalProjectId1))
        val requestDataJson =
          CreateCurrencyWithAssociatedProjectsRequest.createCurrencyWithAssociatedProjectsRequestPlayFormat.writes(
            requestData)
        checkExpectedPermission(WalletPermissions.CurrencyAdminWritePermission)
        (boundedContext
          .createCurrencyWithAssociatedProjects(
            _: CreateCurrencyWithAssociatedProjectsRequest,
            _: ProjectId,
            _: UserId,
            _: Option[Set[ProjectId]])(_: ExecutionContext))
          .expects(requestData, testProjectId, testSenderUserId, Some(testAllAllowedProjectIds), *)
          .returning(Future.successful(currency))
          .once()
        val request =
          FakeRequest(POST, createCurrencyAsAdminEndpointPath, headersWithFakeJwt, AnyContentAsJson(requestDataJson))
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, CREATED, expected = Response.asSuccess(currency))
      }
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.CurrencyAdminWritePermission)
      (boundedContext
        .createCurrencyWithAssociatedProjects(
          _: CreateCurrencyWithAssociatedProjectsRequest,
          _: ProjectId,
          _: UserId,
          _: Option[Set[ProjectId]])(_: ExecutionContext))
        .expects(
          createCurrencyWithAssociatedProjectsRequest,
          testProjectId,
          testSenderUserId,
          Some(testAllAllowedProjectIds),
          *)
        .returning(failedFuture)
        .once()
      val request =
        FakeRequest(
          POST,
          createCurrencyAsAdminEndpointPath,
          headersWithFakeJwt,
          AnyContentAsJson(createCurrencyWithAssociatedProjectsRequestJson))
      testRequestWithInternalServerErrorResponse(request)
    }

    "return BadRequest on empty name" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        createCurrencyAsAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyNameFieldName,
        fieldValue = "",
        maxCurrencyNameLength)
    }

    "return BadRequest on blank name" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        createCurrencyAsAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyNameFieldName,
        fieldValue = " ",
        maxCurrencyNameLength)
    }

    "return BadRequest on too long name" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        createCurrencyAsAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyNameFieldName,
        fieldValue = Random.nextString(maxCurrencyNameLength + 1),
        maxCurrencyNameLength)
    }

    "return BadRequest on empty verboseName" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        createCurrencyAsAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyVerboseNameFieldName,
        fieldValue = "",
        maxCurrencyVerboseNameLength)
    }

    "return BadRequest on blank verboseName" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        createCurrencyAsAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyVerboseNameFieldName,
        fieldValue = " ",
        maxCurrencyVerboseNameLength)
    }

    "return BadRequest on too long verboseName" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        createCurrencyAsAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyVerboseNameFieldName,
        fieldValue = Random.nextString(maxCurrencyVerboseNameLength + 1),
        maxCurrencyVerboseNameLength)
    }

    "return BadRequest on empty symbol" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        createCurrencyAsAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencySymbolFieldName,
        fieldValue = "",
        maxCurrencySymbolLength)
    }

    "return BadRequest on blank symbol" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        createCurrencyAsAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencySymbolFieldName,
        fieldValue = " ",
        maxCurrencySymbolLength)
    }

    "return BadRequest on too long symbol" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        createCurrencyAsAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencySymbolFieldName,
        fieldValue = Random.nextString(maxCurrencySymbolLength + 1),
        maxCurrencySymbolLength)
    }
  }

  "createCurrencyAsSuperAdmin" should {
    "return created currency" in {
      forAll(currencyGen) { currency =>
        val requestData =
          CreateCurrencyWithAssociatedProjectsRequest(
            currency.name,
            currency.verboseName,
            currency.symbol,
            currency.associatedProjects)
        val requestDataJson =
          CreateCurrencyWithAssociatedProjectsRequest.createCurrencyWithAssociatedProjectsRequestPlayFormat.writes(
            requestData)
        checkExpectedPermission(WalletPermissions.CurrencySuperAdminWritePermission)
        (boundedContext
          .createCurrencyWithAssociatedProjects(
            _: CreateCurrencyWithAssociatedProjectsRequest,
            _: ProjectId,
            _: UserId,
            _: Option[Set[ProjectId]])(_: ExecutionContext))
          .expects(requestData, testProjectId, testSenderUserId, None, *)
          .returning(Future.successful(currency))
          .once()
        val request =
          FakeRequest(
            POST,
            createCurrencyAsSuperAdminEndpointPath,
            headersWithFakeJwt,
            AnyContentAsJson(requestDataJson))
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, CREATED, expected = Response.asSuccess(currency))
      }
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.CurrencySuperAdminWritePermission)
      (boundedContext
        .createCurrencyWithAssociatedProjects(
          _: CreateCurrencyWithAssociatedProjectsRequest,
          _: ProjectId,
          _: UserId,
          _: Option[Set[ProjectId]])(_: ExecutionContext))
        .expects(createCurrencyWithAssociatedProjectsRequest, testProjectId, testSenderUserId, None, *)
        .returning(failedFuture)
        .once()
      val request =
        FakeRequest(
          POST,
          createCurrencyAsSuperAdminEndpointPath,
          headersWithFakeJwt,
          AnyContentAsJson(createCurrencyWithAssociatedProjectsRequestJson))
      testRequestWithInternalServerErrorResponse(request)
    }

    "return BadRequest on empty name" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        createCurrencyAsSuperAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyNameFieldName,
        fieldValue = "",
        maxCurrencyNameLength)
    }

    "return BadRequest on blank name" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        createCurrencyAsSuperAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyNameFieldName,
        fieldValue = " ",
        maxCurrencyNameLength)
    }

    "return BadRequest on too long name" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        createCurrencyAsSuperAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyNameFieldName,
        fieldValue = Random.nextString(maxCurrencyNameLength + 1),
        maxCurrencyNameLength)
    }

    "return BadRequest on empty verboseName" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        createCurrencyAsSuperAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyVerboseNameFieldName,
        fieldValue = "",
        maxCurrencyVerboseNameLength)
    }

    "return BadRequest on blank verboseName" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        createCurrencyAsSuperAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyVerboseNameFieldName,
        fieldValue = " ",
        maxCurrencyVerboseNameLength)
    }

    "return BadRequest on too long verboseName" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        createCurrencyAsSuperAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyVerboseNameFieldName,
        fieldValue = Random.nextString(maxCurrencyVerboseNameLength + 1),
        maxCurrencyVerboseNameLength)
    }

    "return BadRequest on empty symbol" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        createCurrencyAsSuperAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencySymbolFieldName,
        fieldValue = "",
        maxCurrencySymbolLength)
    }

    "return BadRequest on blank symbol" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        createCurrencyAsSuperAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencySymbolFieldName,
        fieldValue = " ",
        maxCurrencySymbolLength)
    }

    "return BadRequest on too long symbol" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        createCurrencyAsSuperAdminEndpointPath,
        createCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencySymbolFieldName,
        fieldValue = Random.nextString(maxCurrencySymbolLength + 1),
        maxCurrencySymbolLength)
    }
  }

  "updateCurrencyAsAdmin" should {
    val path = updateCurrencyAsAdminEndpointPath(testCurrencyId)

    "process proper data" in {
      forAll(currencyGen) { currency =>
        val associatedProjects = List(ProjectId(testAuthContext.primaryProjectId))
        val requestData =
          UpdateCurrencyWithAssociatedProjectsRequest(
            currency.name,
            currency.verboseName,
            currency.symbol,
            associatedProjects)
        val requestDataJson =
          UpdateCurrencyWithAssociatedProjectsRequest.updateCurrencyWithAssociatedProjectsRequestPlayFormat.writes(
            requestData)
        checkExpectedPermission(WalletPermissions.CurrencyAdminWritePermission)
        (boundedContext
          .updateCurrencyWithAssociatedProjects(
            _: CurrencyId,
            _: UpdateCurrencyWithAssociatedProjectsRequest,
            _: ProjectId,
            _: UserId,
            _: Option[Set[ProjectId]])(_: ExecutionContext))
          .expects(testCurrencyId, requestData, testProjectId, testSenderUserId, Some(testAllAllowedProjectIds), *)
          .returning(EitherT[Future, UpdateCurrencyError, Currency](Future.successful(Right(currency))))
          .once()
        val request =
          FakeRequest(PATCH, path, headersWithFakeJwt, AnyContentAsJson(requestDataJson))
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, OK, expected = Response.asSuccess(currency))
      }
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.CurrencyAdminWritePermission)
      (boundedContext
        .updateCurrencyWithAssociatedProjects(
          _: CurrencyId,
          _: UpdateCurrencyWithAssociatedProjectsRequest,
          _: ProjectId,
          _: UserId,
          _: Option[Set[ProjectId]])(_: ExecutionContext))
        .expects(
          testCurrencyId,
          updateCurrencyWithAssociatedProjectsRequest,
          testProjectId,
          testSenderUserId,
          Some(testAllAllowedProjectIds),
          *)
        .returning(EitherT[Future, UpdateCurrencyError, Currency](failedFuture))
        .once()
      val request =
        FakeRequest(PATCH, path, headersWithFakeJwt, AnyContentAsJson(updateCurrencyWithAssociatedProjectsRequestJson))
      testRequestWithInternalServerErrorResponse(request)
    }

    "return NotFound when currency could not be found" in {
      checkExpectedPermission(WalletPermissions.CurrencyAdminWritePermission)
      (boundedContext
        .updateCurrencyWithAssociatedProjects(
          _: CurrencyId,
          _: UpdateCurrencyWithAssociatedProjectsRequest,
          _: ProjectId,
          _: UserId,
          _: Option[Set[ProjectId]])(_: ExecutionContext))
        .expects(
          testCurrencyId,
          updateCurrencyWithAssociatedProjectsRequest,
          testProjectId,
          testSenderUserId,
          Some(testAllAllowedProjectIds),
          *)
        .returning(EitherT[Future, UpdateCurrencyError, Currency](
          Future.successful(Left(CurrencyNotFoundError(testCurrencyId)))))
        .once()
      val request =
        FakeRequest(PATCH, path, headersWithFakeJwt, AnyContentAsJson(updateCurrencyWithAssociatedProjectsRequestJson))
      testRequestWithErrorResponse(request, None, NOT_FOUND, AdditionalPresentationErrorCode.CurrencyNotFound)
    }

    "return BadRequest on empty name" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyNameFieldName,
        fieldValue = "",
        maxCurrencyNameLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on blank name" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyNameFieldName,
        fieldValue = " ",
        maxCurrencyNameLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on too long name" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyNameFieldName,
        fieldValue = Random.nextString(maxCurrencyNameLength + 1),
        maxCurrencyNameLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on empty verboseName" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyVerboseNameFieldName,
        fieldValue = "",
        maxCurrencyVerboseNameLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on blank verboseName" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyVerboseNameFieldName,
        fieldValue = " ",
        maxCurrencyVerboseNameLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on too long verboseName" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyVerboseNameFieldName,
        fieldValue = Random.nextString(maxCurrencyVerboseNameLength + 1),
        maxCurrencyVerboseNameLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on empty symbol" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencySymbolFieldName,
        fieldValue = "",
        maxCurrencySymbolLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on blank symbol" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencySymbolFieldName,
        fieldValue = " ",
        maxCurrencySymbolLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on too long symbol" in {
      testRequestAsAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencySymbolFieldName,
        fieldValue = Random.nextString(maxCurrencySymbolLength + 1),
        maxCurrencySymbolLength,
        httpRequestType = PATCH)
    }
  }

  "updateCurrencyAsSuperAdmin" should {
    val path = updateCurrencyAsSuperAdminEndpointPath(testCurrencyId)

    "process proper data" in {
      forAll(currencyGen) { currency =>
        val requestData =
          UpdateCurrencyWithAssociatedProjectsRequest(
            currency.name,
            currency.verboseName,
            currency.symbol,
            currency.associatedProjects)
        val requestDataJson =
          UpdateCurrencyWithAssociatedProjectsRequest.updateCurrencyWithAssociatedProjectsRequestPlayFormat.writes(
            requestData)
        checkExpectedPermission(WalletPermissions.CurrencySuperAdminWritePermission)
        (boundedContext
          .updateCurrencyWithAssociatedProjects(
            _: CurrencyId,
            _: UpdateCurrencyWithAssociatedProjectsRequest,
            _: ProjectId,
            _: UserId,
            _: Option[Set[ProjectId]])(_: ExecutionContext))
          .expects(testCurrencyId, requestData, testProjectId, testSenderUserId, None, *)
          .returning(EitherT[Future, UpdateCurrencyError, Currency](Future.successful(Right(currency))))
          .once()
        val request =
          FakeRequest(PATCH, path, headersWithFakeJwt, AnyContentAsJson(requestDataJson))
        testRequestWithStatusCodeAndExpectedJsonContent(app, request, OK, expected = Response.asSuccess(currency))
      }
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.CurrencySuperAdminWritePermission)
      (boundedContext
        .updateCurrencyWithAssociatedProjects(
          _: CurrencyId,
          _: UpdateCurrencyWithAssociatedProjectsRequest,
          _: ProjectId,
          _: UserId,
          _: Option[Set[ProjectId]])(_: ExecutionContext))
        .expects(testCurrencyId, updateCurrencyWithAssociatedProjectsRequest, testProjectId, testSenderUserId, None, *)
        .returning(EitherT[Future, UpdateCurrencyError, Currency](failedFuture))
        .once()
      val request =
        FakeRequest(PATCH, path, headersWithFakeJwt, AnyContentAsJson(updateCurrencyWithAssociatedProjectsRequestJson))
      testRequestWithInternalServerErrorResponse(request)
    }

    "return NotFound when currency could not be found" in {
      checkExpectedPermission(WalletPermissions.CurrencySuperAdminWritePermission)
      (boundedContext
        .updateCurrencyWithAssociatedProjects(
          _: CurrencyId,
          _: UpdateCurrencyWithAssociatedProjectsRequest,
          _: ProjectId,
          _: UserId,
          _: Option[Set[ProjectId]])(_: ExecutionContext))
        .expects(testCurrencyId, updateCurrencyWithAssociatedProjectsRequest, testProjectId, testSenderUserId, None, *)
        .returning(EitherT[Future, UpdateCurrencyError, Currency](
          Future.successful(Left(CurrencyNotFoundError(testCurrencyId)))))
        .once()
      val request =
        FakeRequest(PATCH, path, headersWithFakeJwt, AnyContentAsJson(updateCurrencyWithAssociatedProjectsRequestJson))
      testRequestWithErrorResponse(request, None, NOT_FOUND, AdditionalPresentationErrorCode.CurrencyNotFound)
    }

    "return BadRequest on empty name" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyNameFieldName,
        fieldValue = "",
        maxCurrencyNameLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on blank name" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyNameFieldName,
        fieldValue = " ",
        maxCurrencyNameLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on too long name" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyNameFieldName,
        fieldValue = Random.nextString(maxCurrencyNameLength + 1),
        maxCurrencyNameLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on empty verboseName" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyVerboseNameFieldName,
        fieldValue = "",
        maxCurrencyVerboseNameLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on blank verboseName" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyVerboseNameFieldName,
        fieldValue = " ",
        maxCurrencyVerboseNameLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on too long verboseName" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencyVerboseNameFieldName,
        fieldValue = Random.nextString(maxCurrencyVerboseNameLength + 1),
        maxCurrencyVerboseNameLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on empty symbol" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencySymbolFieldName,
        fieldValue = "",
        maxCurrencySymbolLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on blank symbol" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencySymbolFieldName,
        fieldValue = " ",
        maxCurrencySymbolLength,
        httpRequestType = PATCH)
    }

    "return BadRequest on too long symbol" in {
      testRequestAsSuperAdminWithWrongCurrencyStringField(
        path,
        updateCurrencyWithAssociatedProjectsRequestJson,
        fieldName = currencySymbolFieldName,
        fieldValue = Random.nextString(maxCurrencySymbolLength + 1),
        maxCurrencySymbolLength,
        httpRequestType = PATCH)
    }
  }

  "deleteCurrencyFromProjectAsAdmin" should {
    val path = deleteCurrencyFromProjectAsAdminEndpointPath(testProjectId, testCurrencyId)

    "use proper project and currency" in {
      checkExpectedPermission(WalletPermissions.CurrencyAdminWritePermission)
      (boundedContext
        .deleteCurrencyProjectAssociation(_: ProjectId, _: CurrencyId, _: UserId)(_: ExecutionContext))
        .expects(testProjectId, testCurrencyId, testSenderUserId, *)
        .returning(EitherT[Future, DeleteCurrencyProjectAssociationError, Unit](Future.successful(Right(()))))
        .once()
      val request =
        FakeRequest(DELETE, path, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithStatusCodeAndEmptyResponse(request, NO_CONTENT)
    }

    "return InternalServerError on unexpected Future error" in {
      checkExpectedPermission(WalletPermissions.CurrencyAdminWritePermission)
      (boundedContext
        .deleteCurrencyProjectAssociation(_: ProjectId, _: CurrencyId, _: UserId)(_: ExecutionContext))
        .expects(testProjectId, testCurrencyId, testSenderUserId, *)
        .returning(EitherT[Future, DeleteCurrencyProjectAssociationError, Unit](failedFuture))
        .once()
      val request =
        FakeRequest(DELETE, path, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }

    "return NotFound when currency could not be found" in {
      checkExpectedPermission(WalletPermissions.CurrencyAdminWritePermission)
      (boundedContext
        .deleteCurrencyProjectAssociation(_: ProjectId, _: CurrencyId, _: UserId)(_: ExecutionContext))
        .expects(testProjectId, testCurrencyId, testSenderUserId, *)
        .returning(EitherT[Future, DeleteCurrencyProjectAssociationError, Unit](
          Future.successful(Left(CurrencyAssociatedWithProjectNotFoundError(testProjectId, testCurrencyId)))))
        .once()
      val request =
        FakeRequest(DELETE, path, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithErrorResponse(request, None, NOT_FOUND, AdditionalPresentationErrorCode.ProjectCurrencyNotFound)
    }

    "return Forbidden when the project is not in the associated ones" in {
      checkExpectedPermission(WalletPermissions.CurrencyAdminWritePermission)
      val path = deleteCurrencyFromProjectAsAdminEndpointPath(ProjectId.random(), testCurrencyId)
      val request = FakeRequest(DELETE, path, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithErrorResponse(request, None, FORBIDDEN, PresentationErrorCode.Forbidden)
    }
  }

  private def testRequestAsAdminWithWrongCurrencyStringField(
      path: String,
      json: JsObject,
      fieldName: String,
      fieldValue: String,
      maxLength: Int,
      httpRequestType: String = POST): Assertion = {
    checkExpectedPermission(WalletPermissions.CurrencyAdminWritePermission)
    testRequestWithWrongCurrencyStringField(path, json, fieldName, fieldValue, maxLength, httpRequestType)
  }

  private def testRequestAsSuperAdminWithWrongCurrencyStringField(
      path: String,
      json: JsObject,
      fieldName: String,
      fieldValue: String,
      maxLength: Int,
      httpRequestType: String = POST): Assertion = {
    checkExpectedPermission(WalletPermissions.CurrencySuperAdminWritePermission)
    testRequestWithWrongCurrencyStringField(path, json, fieldName, fieldValue, maxLength, httpRequestType)
  }

  private def testRequestWithWrongCurrencyStringField(
      path: String,
      json: JsObject,
      fieldName: String,
      fieldValue: String,
      maxLength: Int,
      httpRequestType: String = POST): Assertion = {
    val expectedErrorMessage = wrongCurrencyStringFieldErrorMessage(fieldName, fieldValue, maxLength)
    val wrongJson = jsonWithUpdatedStringField(json, fieldName, fieldValue)
    val request =
      FakeRequest(httpRequestType, path, headersWithFakeJwt, AnyContentAsJson(wrongJson))
    testRequestWithBadRequestResponse(request, expectedErrorMessage)
  }

  private def wrongCurrencyStringFieldErrorMessage(fieldName: String, value: String, maxLength: Int): String =
    s"Invalid value for: body (requirement failed: '$fieldName' must be non-empty, non-blank and not longer " +
    s"than $maxLength characters, but it was '$value')"
}
