package stella.wallet.it.routes

import org.scalatest.Assertion
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.models.Ids.ProjectId

import stella.wallet.it.utils.TestAuthContext
import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.currency.CreateCurrencyWithAssociatedProjectsRequest
import stella.wallet.models.currency.Currency
import stella.wallet.routes.ResponseFormats._
import stella.wallet.routes.TestConstants.Endpoint.createCurrencyAsSuperAdminEndpointPath
import stella.wallet.routes.TestConstants.Endpoint.deleteCurrencyFromProjectAsAdminEndpointPath

trait CurrencyOperations { self: RoutesSpecBase =>

  protected def createCurrencyAsSuperAdmin(
      requestPayload: CreateCurrencyWithAssociatedProjectsRequest,
      authContext: TestAuthContext): Currency = {
    val requestPayloadJson =
      CreateCurrencyWithAssociatedProjectsRequest.createCurrencyWithAssociatedProjectsRequestPlayFormat.writes(
        requestPayload)
    val request =
      FakeRequest(POST, createCurrencyAsSuperAdminEndpointPath, headersWithJwt, AnyContentAsJson(requestPayloadJson))
    sendRequestAndReturn[AnyContentAsJson, Currency](request, authContext, CREATED)
  }

  protected def createCurrencyAsSuperAdminAssociatedWithGivenProjects(projectIds: ProjectId*): CurrencyId =
    createCurrencyAsSuperAdmin(
      CreateCurrencyWithAssociatedProjectsRequest("c_name", "c_verboseName", "c_symbol", projectIds.toList),
      TestAuthContext()).id

  protected def createCurrencyAsSuperAdminAssociatedWithGivenProjects(
      name: String,
      verboseName: String,
      symbol: String,
      projectIds: List[ProjectId]): CurrencyId =
    createCurrencyAsSuperAdmin(
      CreateCurrencyWithAssociatedProjectsRequest(name, verboseName, symbol, projectIds),
      TestAuthContext()).id

  protected def deleteCurrencyFromProject(authContext: TestAuthContext, currencyId: CurrencyId): Assertion = {
    val request =
      FakeRequest(
        DELETE,
        deleteCurrencyFromProjectAsAdminEndpointPath(authContext.primaryProjectId, currencyId),
        headersWithJwt,
        AnyContentAsEmpty)
    sendRequestWithEmptyResponse(request, authContext, NO_CONTENT)
  }
}
