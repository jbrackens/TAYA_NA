package stella.wallet.it.routes.wallet

import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.it.routes.CurrencyOperations
import stella.wallet.it.routes.RoutesSpecBase
import stella.wallet.it.routes.WalletOperations
import stella.wallet.it.utils.TestAuthContext
import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.wallet._
import stella.wallet.routes.ResponseFormats._
import stella.wallet.routes.SampleObjectFactory._
import stella.wallet.routes.TestConstants.Endpoint._
import stella.wallet.routes.error.AdditionalPresentationErrorCode

// it's not ideal that we check requests and use them at the same time to verify other requests
// without e.g. checking the database directly, but the the db there's just the serialised data
// created by Akka persistence
class WalletRoutesSpec extends RoutesSpecBase with CurrencyOperations with WalletOperations {

  "getBalances" should {
    "return empty list for uninitialised wallet" in {
      val authContext = TestAuthContext()
      getBalances(authContext) mustBe WalletBalance(Nil)
    }

    "return results for a proper user taking into account project currencies" in {
      withDataToFetchPopulated {
        (
            projectId1,
            projectId2,
            _,
            _,
            _,
            userId1,
            userId2,
            project1User1Balance,
            project1User2Balance,
            project2User1Balance,
            project2User2Balance) =>
          getBalances(TestAuthContext(userId1, projectId1)) mustBe project1User1Balance
          getBalances(TestAuthContext(userId2, projectId1)) mustBe project1User2Balance
          getBalances(TestAuthContext(userId1, projectId2)) mustBe project2User1Balance
          getBalances(TestAuthContext(userId2, projectId2)) mustBe project2User2Balance
          ()
      }
    }
  }

  "getBalance" should {
    "return 0 for uninitialised wallet" in {
      val authContext = TestAuthContext()
      val currencyId = createCurrencyAsSuperAdminAssociatedWithGivenProjects(authContext.primaryProjectId)
      val request = FakeRequest(GET, getBalanceEndpointPath(currencyId), headersWithJwt, AnyContentAsEmpty)
      sendRequestAndReturn[AnyContentAsEmpty.type, WalletBalanceInCurrency](
        request,
        authContext) mustBe WalletBalanceInCurrency(currencyId, 0)
    }

    "return not found if currency is not associated with project" in {
      val authContext = TestAuthContext()
      val currencyId = CurrencyId.random()
      val request = FakeRequest(GET, getBalanceEndpointPath(currencyId), headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.ProjectCurrencyNotFound,
        authContext = authContext)
    }

    "return result for a proper user taking into account project currencies" in {
      withDataToFetchPopulated {
        (
            projectId1,
            projectId2,
            currencyId1,
            currencyId2,
            _,
            userId1,
            userId2,
            project1User1Balance,
            _,
            project2User1Balance,
            project2User2Balance) =>
          getBalance(TestAuthContext(userId1, projectId1), currencyId1) mustBe project1User1Balance.balanceValues
            .find(_.currencyId == currencyId1)
            .value
          getBalance(TestAuthContext(userId1, projectId1), currencyId2) mustBe project1User1Balance.balanceValues
            .find(_.currencyId == currencyId2)
            .value
          getBalance(TestAuthContext(userId1, projectId2), currencyId1) mustBe project2User1Balance.balanceValues
            .find(_.currencyId == currencyId1)
            .value
          getBalance(TestAuthContext(userId2, projectId2), currencyId1) mustBe project2User2Balance.balanceValues
            .find(_.currencyId == currencyId1)
            .value
          ()
      }
    }
  }

  "getBalancesAsAdmin" should {
    "return empty list for uninitialised wallet" in {
      val projectId = ProjectId.random()
      val walletOwnerId = UserId.random()
      getBalancesAsAdmin(projectId, walletOwnerId) mustBe WalletBalance(Nil)
    }

    "return results for a proper user taking into account project currencies" in {
      withDataToFetchPopulated {
        (
            projectId1,
            projectId2,
            _,
            _,
            _,
            userId1,
            userId2,
            project1User1Balance,
            project1User2Balance,
            project2User1Balance,
            project2User2Balance) =>
          getBalancesAsAdmin(projectId1, userId1) mustBe project1User1Balance
          getBalancesAsAdmin(projectId1, userId2) mustBe project1User2Balance
          getBalancesAsAdmin(projectId2, userId1) mustBe project2User1Balance
          getBalancesAsAdmin(projectId2, userId2) mustBe project2User2Balance
          ()
      }
    }
  }

  "getBalanceAsAdmin" should {
    "return 0 for uninitialised wallet" in {
      val authContext = TestAuthContext()
      val currencyId = createCurrencyAsSuperAdminAssociatedWithGivenProjects(authContext.primaryProjectId)
      val request = FakeRequest(
        GET,
        getBalanceAsAdminEndpointPath(authContext.userId, currencyId),
        headersWithJwt,
        AnyContentAsEmpty)
      sendRequestAndReturn[AnyContentAsEmpty.type, WalletBalanceInCurrency](
        request,
        authContext) mustBe WalletBalanceInCurrency(currencyId, 0)
    }

    "return not found if currency is not associated with project" in {
      val authContext = TestAuthContext()
      val currencyId = CurrencyId.random()
      val request = FakeRequest(
        GET,
        getBalanceAsAdminEndpointPath(authContext.userId, currencyId),
        headersWithJwt,
        AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.ProjectCurrencyNotFound,
        authContext = authContext)
    }

    "return result for a proper user taking into account project currencies" in {
      withDataToFetchPopulated {
        (
            projectId1,
            projectId2,
            currencyId1,
            currencyId2,
            _,
            userId1,
            userId2,
            project1User1Balance,
            _,
            project2User1Balance,
            project2User2Balance) =>
          getBalanceAsAdmin(projectId1, userId1, currencyId1) mustBe project1User1Balance.balanceValues
            .find(_.currencyId == currencyId1)
            .value
          getBalanceAsAdmin(projectId1, userId1, currencyId2) mustBe project1User1Balance.balanceValues
            .find(_.currencyId == currencyId2)
            .value
          getBalanceAsAdmin(projectId2, userId1, currencyId1) mustBe project2User1Balance.balanceValues
            .find(_.currencyId == currencyId1)
            .value
          getBalanceAsAdmin(projectId2, userId2, currencyId1) mustBe project2User2Balance.balanceValues
            .find(_.currencyId == currencyId1)
            .value
          ()
      }
    }
  }

  "transferFundsAsAdmin" should {
    "return not found if currency is not associated with project" in {
      val authContext = TestAuthContext()
      val request =
        FakeRequest(
          POST,
          transferFundsAsAdminEndpointPath(authContext.primaryProjectId, testUserId),
          headersWithJwt,
          AnyContentAsJson(transferFundsRequestJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.ProjectCurrencyNotFound,
        authContext = authContext)
    }

    "return Conflict when withdrawing funds but wallet in currency was not yet initialised" in {
      val authContext = TestAuthContext()
      val currencyId = createCurrencyAsSuperAdminAssociatedWithGivenProjects(authContext.primaryProjectId)
      val transferFundsRequest = TransferFundsRequest(
        transferType = FundsTransferType.WithdrawFunds,
        externalTransactionId = "test-tx",
        title = "Test tx",
        currencyId = currencyId,
        amount = PositiveBigDecimal(10))
      val transferFundsRequestJson =
        TransferFundsRequest.transferFundsRequestPlayFormat.writes(transferFundsRequest)
      val request =
        FakeRequest(
          POST,
          transferFundsAsAdminEndpointPath(authContext.primaryProjectId, authContext.userId),
          headersWithJwt,
          AnyContentAsJson(transferFundsRequestJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = CONFLICT,
        expectedErrorCode = AdditionalPresentationErrorCode.InsufficientFunds,
        authContext = authContext)
    }

    "return Conflict when withdrawing funds and wallet in currency was initialised but there's not enough funds" in {
      val authContext = TestAuthContext()
      val currencyId = createCurrencyAsSuperAdminAssociatedWithGivenProjects(authContext.primaryProjectId)
      topUpFunds(authContext.primaryProjectId, authContext.userId, currencyId, PositiveBigDecimal(1.1))
      val transferFundsRequest = TransferFundsRequest(
        transferType = FundsTransferType.WithdrawFunds,
        externalTransactionId = "test-tx",
        title = "Test tx",
        currencyId = currencyId,
        amount = PositiveBigDecimal(10))
      val transferFundsRequestJson =
        TransferFundsRequest.transferFundsRequestPlayFormat.writes(transferFundsRequest)
      val request =
        FakeRequest(
          POST,
          transferFundsAsAdminEndpointPath(authContext.primaryProjectId, authContext.userId),
          headersWithJwt,
          AnyContentAsJson(transferFundsRequestJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = CONFLICT,
        expectedErrorCode = AdditionalPresentationErrorCode.InsufficientFunds,
        authContext = authContext)
    }

    "properly change wallet status" in {
      val authContext = TestAuthContext()
      val walletOwnerId = UserId.random()
      val currencyId = createCurrencyAsSuperAdminAssociatedWithGivenProjects(authContext.primaryProjectId)
      topUpFunds(authContext.primaryProjectId, walletOwnerId, currencyId, PositiveBigDecimal(10))
      getBalanceAsAdmin(authContext.primaryProjectId, walletOwnerId, currencyId) mustBe WalletBalanceInCurrency(
        currencyId,
        10)

      topUpFunds(authContext.primaryProjectId, walletOwnerId, currencyId, PositiveBigDecimal(7.2))
      getBalanceAsAdmin(authContext.primaryProjectId, walletOwnerId, currencyId) mustBe WalletBalanceInCurrency(
        currencyId,
        17.2)

      withdrawFunds(authContext.primaryProjectId, walletOwnerId, currencyId, PositiveBigDecimal(2.3))
      getBalanceAsAdmin(authContext.primaryProjectId, walletOwnerId, currencyId) mustBe WalletBalanceInCurrency(
        currencyId,
        14.9)

      topUpFunds(authContext.primaryProjectId, walletOwnerId, currencyId, PositiveBigDecimal(5))
      getBalanceAsAdmin(authContext.primaryProjectId, walletOwnerId, currencyId) mustBe WalletBalanceInCurrency(
        currencyId,
        19.9)
    }
  }

  private def getBalances(authContext: TestAuthContext): WalletBalance = {
    val request = FakeRequest(GET, getBalancesEndpointPath, headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturn[AnyContentAsEmpty.type, WalletBalance](request, authContext)
  }

  private def getBalance(authContext: TestAuthContext, currencyId: CurrencyId): WalletBalanceInCurrency = {
    val request = FakeRequest(GET, getBalanceEndpointPath(currencyId), headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturn[AnyContentAsEmpty.type, WalletBalanceInCurrency](request, authContext)
  }

  private def getBalancesAsAdmin(projectId: ProjectId, walletOwnerId: UserId): WalletBalance = {
    val authContext = TestAuthContext(primaryProjectId = projectId)
    val request =
      FakeRequest(GET, getBalancesAsAdminEndpointPath(walletOwnerId), headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturn[AnyContentAsEmpty.type, WalletBalance](request, authContext)
  }

  private def getBalanceAsAdmin(
      projectId: ProjectId,
      walletOwnerId: UserId,
      currencyId: CurrencyId): WalletBalanceInCurrency = {
    val authContext = TestAuthContext(primaryProjectId = projectId)
    val request =
      FakeRequest(GET, getBalanceAsAdminEndpointPath(walletOwnerId, currencyId), headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturn[AnyContentAsEmpty.type, WalletBalanceInCurrency](request, authContext)
  }

  private def withDataToFetchPopulated(
      body: (
          ProjectId,
          ProjectId,
          CurrencyId,
          CurrencyId,
          CurrencyId,
          UserId,
          UserId,
          WalletBalance,
          WalletBalance,
          WalletBalance,
          WalletBalance) => Unit): Unit = {
    val projectId1 = ProjectId.random()
    val projectId2 = ProjectId.random()
    val currencyId1 = createCurrencyAsSuperAdminAssociatedWithGivenProjects(projectId1, projectId2)
    val currencyId2 = createCurrencyAsSuperAdminAssociatedWithGivenProjects(projectId1)
    val currencyId3 = createCurrencyAsSuperAdminAssociatedWithGivenProjects(projectId2)
    val userId1 = UserId.random()
    val userId2 = UserId.random()
    // first user wallet
    topUpFunds(projectId1, userId1, currencyId1, PositiveBigDecimal(10.1))
    // adding to the same wallet but via second project
    topUpFunds(projectId2, userId1, currencyId1, PositiveBigDecimal(2))
    topUpFunds(projectId1, userId1, currencyId2, PositiveBigDecimal(7))

    // second user wallet
    topUpFunds(projectId2, userId2, currencyId1, PositiveBigDecimal(64))
    topUpFunds(projectId2, userId2, currencyId3, PositiveBigDecimal(32.99))

    val project1User1Balance = WalletBalance(
      List(WalletBalanceInCurrency(currencyId1, 12.1), WalletBalanceInCurrency(currencyId2, 7)).sortBy(_.currencyId))

    val project1User2Balance = WalletBalance(
      List(WalletBalanceInCurrency(currencyId1, 64), WalletBalanceInCurrency(currencyId2, 0)).sortBy(_.currencyId))

    val project2User1Balance = WalletBalance(
      List(WalletBalanceInCurrency(currencyId1, 12.1), WalletBalanceInCurrency(currencyId3, 0)).sortBy(_.currencyId))

    val project2User2Balance = WalletBalance(
      List(WalletBalanceInCurrency(currencyId1, 64), WalletBalanceInCurrency(currencyId3, 32.99)).sortBy(_.currencyId))

    body(
      projectId1,
      projectId2,
      currencyId1,
      currencyId2,
      currencyId3,
      userId1,
      userId2,
      project1User1Balance,
      project1User2Balance,
      project2User1Balance,
      project2User2Balance)
  }
}
