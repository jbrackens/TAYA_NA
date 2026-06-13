package stella.wallet.it.routes.currency

import scala.concurrent.Await

import org.scalacheck.Gen
import org.scalatest.Inside
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.models.Ids.ProjectId

import stella.wallet.gen.Generators._
import stella.wallet.it.routes.CurrencyOperations
import stella.wallet.it.routes.RoutesSpecBase
import stella.wallet.it.utils.TestAuthContext
import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.currency._
import stella.wallet.routes.ResponseFormats._
import stella.wallet.routes.SampleObjectFactory._
import stella.wallet.routes.TestConstants.Endpoint._
import stella.wallet.routes.error.AdditionalPresentationErrorCode

class CurrencyRoutesSpec extends RoutesSpecBase with CurrencyOperations with Inside {

  "createCurrencyAsAdmin" should {
    "store and return proper currency and add entry to history" in {
      val authContext = TestAuthContext()
      val requestPayload =
        createCurrencyWithAssociatedProjectsRequest.copy(associatedProjects = List(authContext.primaryProjectId))
      // WHEN: currency is created by admin
      val currency = createCurrencyAsAdmin(requestPayload, authContext)

      // THEN: its fields are as expected
      currency.id mustBe testCurrencyIdProvider.getLastGeneratedValue()
      currency.name mustBe requestPayload.name
      currency.verboseName mustBe requestPayload.verboseName
      currency.symbol mustBe requestPayload.symbol
      currency.associatedProjects mustBe requestPayload.associatedProjects
      currency.createdAt mustBe testClock.currentUtcOffsetDateTime()
      currency.updatedAt mustBe testClock.currentUtcOffsetDateTime()

      checkDatabaseForCurrencyAssociatedWithProjectAfterCreateOperation(authContext, currency)
    }

    "store and return proper currency and add entry to history, keeping only allowed associated projects" in {
      val authContext = TestAuthContext()
      val notAllowedProjectId = ProjectId.random() // the admin doesn't have access to this project via their JWT token
      val requestPayload =
        createCurrencyWithAssociatedProjectsRequest.copy(associatedProjects =
          List(authContext.primaryProjectId) ++ authContext.additionalProjectIds :+ notAllowedProjectId)
      // WHEN: currency is created by admin
      val currency = createCurrencyAsAdmin(requestPayload, authContext)

      // THEN: its fields are as expected
      currency.id mustBe testCurrencyIdProvider.getLastGeneratedValue()
      currency.name mustBe requestPayload.name
      currency.verboseName mustBe requestPayload.verboseName
      currency.symbol mustBe requestPayload.symbol
      currency.associatedProjects must contain theSameElementsAs (List(
        authContext.primaryProjectId) ++ authContext.additionalProjectIds)
      currency.createdAt mustBe testClock.currentUtcOffsetDateTime()
      currency.updatedAt mustBe testClock.currentUtcOffsetDateTime()

      checkDatabaseForCurrencyAssociatedWithProjectAfterCreateOperation(authContext, currency)
    }
  }

  "createCurrencyAsSuperAdmin" should {
    "store and return proper currency" in {
      val authContext = TestAuthContext()
      val requestPayload = createCurrencyWithAssociatedProjectsRequest
      // WHEN: currency is created by super admin
      val currency = createCurrencyAsSuperAdmin(requestPayload, authContext)

      // THEN: its fields are as expected
      currency.name mustBe requestPayload.name
      currency.verboseName mustBe requestPayload.verboseName
      currency.symbol mustBe requestPayload.symbol
      currency.associatedProjects mustBe requestPayload.associatedProjects
      currency.createdAt mustBe testClock.currentUtcOffsetDateTime()
      currency.updatedAt mustBe testClock.currentUtcOffsetDateTime()

      checkDatabaseForCurrencyAssociatedWithProjectAfterCreateOperation(authContext, currency)
    }
  }

  "getCurrencies" should {
    "return empty collection when project is not associated with any currency" in {
      val authContext = TestAuthContext()
      getCurrenciesInProjectAsUser(authContext) mustBe empty
    }

    "return only currencies associated with a given project" in {
      testGetCurrenciesInOneProject(getCurrenciesInProjectAsUser)
    }
  }

  "getCurrency" should {
    "return NotFound when currency does not exist" in {
      val authContext = TestAuthContext()
      val request =
        FakeRequest(GET, getCurrencyEndpointPath(CurrencyId.random()), headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.ProjectCurrencyNotFound,
        authContext = authContext)
    }

    "return NotFound when currency is not associated with a given project" in {
      val authContext = TestAuthContext()
      val otherProjectId = ProjectId.random()
      val currencyId = createCurrencyAsSuperAdminAssociatedWithGivenProjects(otherProjectId)
      val request =
        FakeRequest(GET, getCurrencyEndpointPath(currencyId), headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.ProjectCurrencyNotFound,
        authContext = authContext)
    }

    "return proper currency" in {
      val authContext = TestAuthContext()
      val name1 = "name1"
      val verboseName1 = "verbose name 1"
      val symbol1 = "sym1"
      val projectIds1 = List(authContext.primaryProjectId)
      val name2 = "name2"
      val verboseName2 = "verbose name 2"
      val symbol2 = "sym2"
      val projectIds2 = List(authContext.primaryProjectId, testProjectId)
      val currencyId1 =
        createCurrencyAsSuperAdminAssociatedWithGivenProjects(name1, verboseName1, symbol1, projectIds1)
      val currencyId2 =
        createCurrencyAsSuperAdminAssociatedWithGivenProjects(name2, verboseName2, symbol2, projectIds2)

      val currency1 = getCurrencyInProjectAsUser(authContext, currencyId1)
      currency1.id mustBe currencyId1
      currency1.name mustBe name1
      currency1.verboseName mustBe verboseName1
      currency1.symbol mustBe symbol1

      val currency2 = getCurrencyInProjectAsUser(authContext, currencyId2)
      currency2.id mustBe currencyId2
      currency2.name mustBe name2
      currency2.verboseName mustBe verboseName2
      currency2.symbol mustBe symbol2
    }
  }

  "getCurrenciesAsAdmin" should {
    "return empty collection when project is not associated with any currency" in {
      val authContext = TestAuthContext()
      getCurrenciesInProjectAsAdmin(authContext) mustBe empty
    }

    "return only currencies associated with a given project" in {
      testGetCurrenciesInOneProject(getCurrenciesInProjectAsAdmin)
    }
  }

  "getCurrencyAsAdmin" should {
    "return NotFound when currency does not exist" in {
      val authContext = TestAuthContext()
      val request =
        FakeRequest(GET, getCurrencyAsAdminEndpointPath(CurrencyId.random()), headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.ProjectCurrencyNotFound,
        authContext = authContext)
    }

    "return NotFound when currency is not associated with a given project" in {
      val authContext = TestAuthContext()
      val otherProjectId = ProjectId.random()
      val currencyId = createCurrencyAsSuperAdminAssociatedWithGivenProjects(otherProjectId)
      val request =
        FakeRequest(GET, getCurrencyAsAdminEndpointPath(currencyId), headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.ProjectCurrencyNotFound,
        authContext = authContext)
    }

    "return proper currency" in {
      val authContext = TestAuthContext()
      val name1 = "name1"
      val verboseName1 = "verbose name 1"
      val symbol1 = "sym1"
      val projectIds1 = List(authContext.primaryProjectId)
      val name2 = "name2"
      val verboseName2 = "verbose name 2"
      val symbol2 = "sym2"
      val projectIds2 = List(authContext.primaryProjectId, testProjectId)
      val currencyId1 =
        createCurrencyAsSuperAdminAssociatedWithGivenProjects(name1, verboseName1, symbol1, projectIds1)
      val currencyId2 =
        createCurrencyAsSuperAdminAssociatedWithGivenProjects(name2, verboseName2, symbol2, projectIds2)

      val currency1 = getCurrencyInProjectAsAdmin(authContext, currencyId1)
      currency1.id mustBe currencyId1
      currency1.name mustBe name1
      currency1.verboseName mustBe verboseName1
      currency1.symbol mustBe symbol1

      val currency2 = getCurrencyInProjectAsAdmin(authContext, currencyId2)
      currency2.id mustBe currencyId2
      currency2.name mustBe name2
      currency2.verboseName mustBe verboseName2
      currency2.symbol mustBe symbol2
    }
  }

  "getCurrenciesAsSuperAdmin" should {
    "return all currencies in the system when not filtering by project id" in {
      val authContext = TestAuthContext()
      val authContext2 = TestAuthContext()
      val initialCurrencies = getAllCurrencies(authContext)
      testClock.moveTime()
      val currency1 = createCurrencyAsAdmin(createCurrencyWithAssociatedProjectsRequest, authContext)
      val currency2 = createCurrencyAsSuperAdmin(createCurrencyWithAssociatedProjectsRequest, authContext2)
      val currency3 = createCurrencyAsSuperAdmin(
        createCurrencyWithAssociatedProjectsRequest.copy(associatedProjects = Nil),
        authContext)
      val newCurrencies = getAllCurrencies(authContext)
      newCurrencies mustBe initialCurrencies ++ Seq(currency1, currency2, currency3)
      getAllCurrencies(authContext2) mustBe newCurrencies
    }

    "return empty collection when project is not associated with any currency" in {
      val authContext = TestAuthContext()
      getCurrenciesInProjectAsSuperAdmin(authContext) mustBe empty
    }

    "return only currencies associated with a given project" in {
      testGetCurrenciesInOneProject(getCurrenciesInProjectAsSuperAdmin)
    }
  }

  "getCurrencyAsSuperAdmin" should {
    "return NotFound when currency does not exist" in {
      val authContext = TestAuthContext()
      val request =
        FakeRequest(GET, getCurrencyAsSuperAdminEndpointPath(CurrencyId.random()), headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.CurrencyNotFound,
        authContext = authContext)
    }

    "return proper currency" in {
      val authContext = TestAuthContext()
      val name1 = "name1"
      val verboseName1 = "verbose name 1"
      val symbol1 = "sym1"
      val projectIds1 = Nil
      val name2 = "name2"
      val verboseName2 = "verbose name 2"
      val symbol2 = "sym2"
      val projectIds2 = List(authContext.primaryProjectId, testProjectId)
      val currencyId1 =
        createCurrencyAsSuperAdminAssociatedWithGivenProjects(name1, verboseName1, symbol1, projectIds1)
      val currencyId2 =
        createCurrencyAsSuperAdminAssociatedWithGivenProjects(name2, verboseName2, symbol2, projectIds2)

      val currency1 = getCurrencyAsSuperAdmin(authContext, currencyId1)
      currency1.id mustBe currencyId1
      currency1.name mustBe name1
      currency1.verboseName mustBe verboseName1
      currency1.symbol mustBe symbol1

      val currency2 = getCurrencyAsSuperAdmin(authContext, currencyId2)
      currency2.id mustBe currencyId2
      currency2.name mustBe name2
      currency2.verboseName mustBe verboseName2
      currency2.symbol mustBe symbol2
    }
  }

  "updateCurrencyAsAdmin" should {
    "return NotFound when currency does not exist" in {
      testUpdateCurrencyAsAdminWithNotFoundError(TestAuthContext(), CurrencyId.random())
    }

    "properly update currency" in {
      val authContext = TestAuthContext()
      val originalAssociatedProjects = List(authContext.primaryProjectId)
      val updatedAssociatedProjects = List(authContext.primaryProjectId) ++ authContext.additionalProjectIds
      val currencyPayload = {
        val payload = createCurrencyWithAssociatedProjectsRequestGen.getOne
        payload.copy(associatedProjects = originalAssociatedProjects)
      }
      val currency = createCurrencyAsSuperAdmin(currencyPayload, authContext)
      val changelogEntryAfterCreation = inside(getCurrencyChangelog(currency.id)) { case Seq(entry) =>
        entry
      }

      testClock.moveTime()
      val updatePayload = updateCurrencyWithAssociatedProjectsRequestGen
        .suchThat(c => c.name != currency.name && c.verboseName != currency.verboseName && c.symbol != currency.symbol)
        .sample
        .value
        .copy(associatedProjects = updatedAssociatedProjects)
      val updatePayloadJson =
        UpdateCurrencyWithAssociatedProjectsRequest.updateCurrencyWithAssociatedProjectsRequestPlayFormat.writes(
          updatePayload)
      val request =
        FakeRequest(
          PATCH,
          updateCurrencyAsAdminEndpointPath(currency.id),
          headersWithJwt,
          AnyContentAsJson(updatePayloadJson))
      val updatedCurrency = sendRequestAndReturn[AnyContentAsJson, Currency](request, authContext, OK)
      updatedCurrency.id mustBe currency.id
      updatedCurrency.name mustBe updatePayload.name
      updatedCurrency.verboseName mustBe updatePayload.verboseName
      updatedCurrency.symbol mustBe updatePayload.symbol
      updatedCurrency.associatedProjects must contain theSameElementsAs updatedAssociatedProjects
      updatedCurrency.createdAt mustBe currency.createdAt
      updatedCurrency.updatedAt mustBe testClock.currentUtcOffsetDateTime()

      checkChangelogAfterUpdateOperation(updatedCurrency, authContext, changelogEntryAfterCreation)
    }

    "properly update currency, storing only allowed associated projects and keeping pre-existing ones without access" in {
      val authContext = TestAuthContext()
      val existingProjectIdWithoutAccess = ProjectId.random()
      val newProjectIdWithoutAccess = ProjectId.random()
      val originalAssociatedProjects = List(authContext.primaryProjectId, existingProjectIdWithoutAccess)
      val updatedAssociatedProjects =
        List(authContext.primaryProjectId) ++ authContext.additionalProjectIds :+ newProjectIdWithoutAccess
      val expectedAssociatedProjects =
        List(authContext.primaryProjectId) ++ authContext.additionalProjectIds :+ existingProjectIdWithoutAccess // we don't have access to remove existingProjectIdWithoutAccess
      val currencyPayload = {
        val payload = createCurrencyWithAssociatedProjectsRequestGen.getOne
        payload.copy(associatedProjects = originalAssociatedProjects)
      }
      val currency = createCurrencyAsSuperAdmin(currencyPayload, authContext)
      val changelogEntryAfterCreation = inside(getCurrencyChangelog(currency.id)) { case Seq(entry) =>
        entry
      }

      testClock.moveTime()
      val updatePayload = updateCurrencyWithAssociatedProjectsRequestGen
        .suchThat(c => c.name != currency.name && c.verboseName != currency.verboseName && c.symbol != currency.symbol)
        .sample
        .value
        .copy(associatedProjects = updatedAssociatedProjects)
      val updatePayloadJson =
        UpdateCurrencyWithAssociatedProjectsRequest.updateCurrencyWithAssociatedProjectsRequestPlayFormat.writes(
          updatePayload)
      val request =
        FakeRequest(
          PATCH,
          updateCurrencyAsAdminEndpointPath(currency.id),
          headersWithJwt,
          AnyContentAsJson(updatePayloadJson))
      val updatedCurrency = sendRequestAndReturn[AnyContentAsJson, Currency](request, authContext, OK)
      updatedCurrency.id mustBe currency.id
      updatedCurrency.name mustBe updatePayload.name
      updatedCurrency.verboseName mustBe updatePayload.verboseName
      updatedCurrency.symbol mustBe updatePayload.symbol
      updatedCurrency.associatedProjects must contain theSameElementsAs expectedAssociatedProjects
      updatedCurrency.createdAt mustBe currency.createdAt
      updatedCurrency.updatedAt mustBe testClock.currentUtcOffsetDateTime()

      checkChangelogAfterUpdateOperation(updatedCurrency, authContext, changelogEntryAfterCreation)
    }
  }

  "updateCurrencyAsSuperAdmin" should {

    "return NotFound when currency does not exist" in {
      val currencyId = CurrencyId.random()
      val path = updateCurrencyAsSuperAdminEndpointPath(currencyId)
      val authContext = TestAuthContext()
      val request =
        FakeRequest(PATCH, path, headersWithJwt, AnyContentAsJson(updateCurrencyWithAssociatedProjectsRequestJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.CurrencyNotFound,
        authContext = authContext)
    }

    "properly update currency" in {
      val authContext = TestAuthContext()
      val otherAuthContext = TestAuthContext()
      val currencyPayload = createCurrencyWithAssociatedProjectsRequestGen.getOne
      val currency = createCurrencyAsSuperAdmin(currencyPayload, authContext)
      val changelogEntryAfterCreation = inside(getCurrencyChangelog(currency.id)) { case Seq(entry) =>
        entry
      }

      testClock.moveTime()
      val updatePayload = updateCurrencyWithAssociatedProjectsRequestGen
        .suchThat(c =>
          c.name != currency.name && c.verboseName != currency.verboseName && c.symbol != currency.symbol && c.associatedProjects != currency.associatedProjects)
        .sample
        .value
      val updatePayloadJson =
        UpdateCurrencyWithAssociatedProjectsRequest.updateCurrencyWithAssociatedProjectsRequestPlayFormat.writes(
          updatePayload)
      val request =
        FakeRequest(
          PATCH,
          updateCurrencyAsSuperAdminEndpointPath(currency.id),
          headersWithJwt,
          AnyContentAsJson(updatePayloadJson))
      val updatedCurrency = sendRequestAndReturn[AnyContentAsJson, Currency](request, otherAuthContext, OK)
      updatedCurrency.id mustBe currency.id
      updatedCurrency.name mustBe updatePayload.name
      updatedCurrency.verboseName mustBe updatePayload.verboseName
      updatedCurrency.symbol mustBe updatePayload.symbol
      updatedCurrency.associatedProjects mustBe updatePayload.associatedProjects
      updatedCurrency.createdAt mustBe currency.createdAt
      updatedCurrency.updatedAt mustBe testClock.currentUtcOffsetDateTime()

      checkChangelogAfterUpdateOperation(updatedCurrency, otherAuthContext, changelogEntryAfterCreation)
    }
  }

  "deleteCurrencyFromProjectAsAdmin" should {
    "return NotFound when currency does not exist" in {
      testDeleteCurrencyFromProjectAsAdminWithNotFoundError(TestAuthContext(), CurrencyId.random())
    }

    "return NotFound when currency is not associated with any project" in {
      val authContext = TestAuthContext()
      val abandonedCurrencyPayload =
        createCurrencyWithAssociatedProjectsRequestGen.getOne.copy(associatedProjects = Nil)
      val abandonedCurrency = createCurrencyAsSuperAdmin(abandonedCurrencyPayload, authContext)
      testDeleteCurrencyFromProjectAsAdminWithNotFoundError(authContext, abandonedCurrency.id)
    }

    "return NotFound when currency is associated only with other project" in {
      val authContext = TestAuthContext()
      val otherProjectsPayload = createCurrencyWithAssociatedProjectsRequestGen
        .suchThat(!_.associatedProjects.contains(authContext.primaryProjectId))
        .sample
        .value
      val otherProjectsCurrency = createCurrencyAsSuperAdmin(otherProjectsPayload, authContext)
      testDeleteCurrencyFromProjectAsAdminWithNotFoundError(authContext, otherProjectsCurrency.id)
    }

    "properly remove association for currency" in {
      val authContext = TestAuthContext()
      val currencyPayload = {
        val payload = createCurrencyWithAssociatedProjectsRequestGen.getOne
        payload.copy(associatedProjects = payload.associatedProjects.appended(authContext.primaryProjectId))
      }
      val currency = createCurrencyAsSuperAdmin(currencyPayload, authContext)
      val changelogEntryAfterCreation = inside(getCurrencyChangelog(currency.id)) { case Seq(entry) =>
        entry
      }

      testClock.moveTime()
      deleteCurrencyFromProject(authContext, currency.id)

      val updatedCurrency = getCurrencyFromDatabase(currency.id).value.toCurrency

      updatedCurrency.id mustBe currency.id
      updatedCurrency.name mustBe currency.name
      updatedCurrency.verboseName mustBe currency.verboseName
      updatedCurrency.symbol mustBe currency.symbol
      updatedCurrency.associatedProjects mustBe currency.associatedProjects.filterNot(_ == authContext.primaryProjectId)
      updatedCurrency.createdAt mustBe currency.createdAt
      updatedCurrency.updatedAt mustBe testClock.currentUtcOffsetDateTime()

      checkChangelogAfterUpdateOperation(updatedCurrency, authContext, changelogEntryAfterCreation)
    }
  }

  private def testGetCurrenciesInOneProject(getCurrencies: TestAuthContext => Seq[Currency]) = {
    // GIVEN: currencies associated with a given project, other projects and without any association
    val authContext = TestAuthContext()
    val thisProjectCurrencyPayload = createCurrencyWithAssociatedProjectsRequestGen.getOne
      .copy(associatedProjects = List(authContext.primaryProjectId))
    val abandonedCurrencyPayload =
      createCurrencyWithAssociatedProjectsRequestGen.getOne.copy(associatedProjects = Nil)
    val otherProjectsPayload = createCurrencyWithAssociatedProjectsRequestGen
      .suchThat(r =>
        (authContext.additionalProjectIds + authContext.primaryProjectId).forall(!r.associatedProjects.contains(_)))
      .sample
      .value
    val sharedCurrencyPayload = {
      val payload =
        createCurrencyWithAssociatedProjectsRequestGen.suchThat(_.associatedProjects.nonEmpty).getOne
      payload.copy(associatedProjects = payload.associatedProjects.appended(authContext.primaryProjectId))
    }

    val thisProjectCurrency = createCurrencyAsAdmin(thisProjectCurrencyPayload, authContext)
    createCurrencyAsSuperAdmin(abandonedCurrencyPayload, authContext)
    createCurrencyAsSuperAdmin(otherProjectsPayload, authContext)
    val sharedCurrency = createCurrencyAsSuperAdmin(sharedCurrencyPayload, authContext)

    // WHEN: we fetch currencies for one project
    val currencies = getCurrencies(authContext)

    // THEN: only ones currently associated with with it are returned
    currencies shouldBe Seq(thisProjectCurrency, sharedCurrency)
  }

  private def testUpdateCurrencyAsAdminWithNotFoundError(authContext: TestAuthContext, currencyId: CurrencyId) = {
    val path = updateCurrencyAsAdminEndpointPath(currencyId)
    val request =
      FakeRequest(PATCH, path, headersWithJwt, AnyContentAsJson(updateCurrencyWithAssociatedProjectsRequestJson))
    testFailedRequest(
      request = request,
      expectedStatusCode = NOT_FOUND,
      expectedErrorCode = AdditionalPresentationErrorCode.CurrencyNotFound,
      authContext = authContext)
  }

  private def testDeleteCurrencyFromProjectAsAdminWithNotFoundError(
      authContext: TestAuthContext,
      currencyId: CurrencyId) = {
    val path = deleteCurrencyFromProjectAsAdminEndpointPath(authContext.primaryProjectId, currencyId)
    val request =
      FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
    testFailedRequest(
      request = request,
      expectedStatusCode = NOT_FOUND,
      expectedErrorCode = AdditionalPresentationErrorCode.ProjectCurrencyNotFound,
      authContext = authContext)
  }

  private def createCurrencyAsAdmin(
      requestPayload: CreateCurrencyWithAssociatedProjectsRequest,
      authContext: TestAuthContext): Currency = {
    val requestPayloadJson =
      CreateCurrencyWithAssociatedProjectsRequest.createCurrencyWithAssociatedProjectsRequestPlayFormat.writes(
        requestPayload)
    val request =
      FakeRequest(POST, createCurrencyAsAdminEndpointPath, headersWithJwt, AnyContentAsJson(requestPayloadJson))
    sendRequestAndReturn[AnyContentAsJson, Currency](request, authContext, CREATED)
  }

  private def getAllCurrencies(authContext: TestAuthContext): Seq[Currency] = {
    val request =
      FakeRequest(GET, getCurrenciesAsSuperAdminEndpointPath(), headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturn[AnyContentAsEmpty.type, Seq[Currency]](request, authContext, OK)
  }

  private def getCurrenciesInProjectAsUser(authContext: TestAuthContext): Seq[Currency] = {
    val request =
      FakeRequest(GET, getCurrenciesEndpointPath, headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturn[AnyContentAsEmpty.type, Seq[Currency]](request, authContext, OK)
  }

  private def getCurrencyInProjectAsUser(authContext: TestAuthContext, currencyId: CurrencyId): Currency = {
    val request =
      FakeRequest(GET, getCurrencyEndpointPath(currencyId), headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturn[AnyContentAsEmpty.type, Currency](request, authContext, OK)
  }

  private def getCurrenciesInProjectAsAdmin(authContext: TestAuthContext): Seq[Currency] = {
    val request =
      FakeRequest(GET, getCurrenciesEndpointPath, headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturn[AnyContentAsEmpty.type, Seq[Currency]](request, authContext, OK)
  }

  private def getCurrencyInProjectAsAdmin(authContext: TestAuthContext, currencyId: CurrencyId): Currency = {
    val request =
      FakeRequest(GET, getCurrencyAsAdminEndpointPath(currencyId), headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturn[AnyContentAsEmpty.type, Currency](request, authContext, OK)
  }

  private def getCurrenciesInProjectAsSuperAdmin(authContext: TestAuthContext): Seq[Currency] = {
    val request =
      FakeRequest(
        GET,
        getCurrenciesAsSuperAdminEndpointPath(Some(authContext.primaryProjectId)),
        headersWithJwt,
        AnyContentAsEmpty)
    val otherAuthContext = TestAuthContext()
    sendRequestAndReturn[AnyContentAsEmpty.type, Seq[Currency]](request, otherAuthContext, OK)
  }

  private def getCurrencyAsSuperAdmin(authContext: TestAuthContext, currencyId: CurrencyId): Currency = {
    val request =
      FakeRequest(GET, getCurrencyAsSuperAdminEndpointPath(currencyId), headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturn[AnyContentAsEmpty.type, Currency](request, authContext, OK)
  }

  private def checkDatabaseForCurrencyAssociatedWithProjectAfterCreateOperation(
      authContext: TestAuthContext,
      currency: Currency) = {
    // scalastyle:off
    import scala.concurrent.ExecutionContext.Implicits.global
    // scalastyle:on

    // AND: it exists in database
    val currenciesFromDb = Await.result(
      walletModule.currencyRepository.getCurrenciesAssociatedWithProject(currency.associatedProjects.head),
      awaitTimeout)
    currenciesFromDb.map(_.toCurrency) mustBe Seq(currency)

    // AND: there's added an entry to currency changelog
    val changelog = getCurrencyChangelog(currency.id)
    inside(changelog) { case Seq(changelogEntry) =>
      changelogEntry.currencyId mustBe currenciesFromDb.head.id
      changelogEntry.currencyPublicId mustBe currency.id
      changelogEntry.name mustBe currency.name
      changelogEntry.verboseName mustBe currency.verboseName
      changelogEntry.symbol mustBe currency.symbol
      changelogEntry.userProjectId mustBe authContext.primaryProjectId
      changelogEntry.userId mustBe authContext.userId
      changelogEntry.associatedProjects mustBe currency.associatedProjects
      changelogEntry.createdAt mustBe testClock.currentUtcOffsetDateTime()
    }
  }

  private def checkChangelogAfterUpdateOperation(
      updatedCurrency: Currency,
      updateAuthContext: TestAuthContext,
      createEntry: CurrencyChangelogEntry) = {
    val changelog = getCurrencyChangelog(updatedCurrency.id)
    inside(changelog) { case Seq(firstEntry, updateEntry) =>
      firstEntry mustBe createEntry
      updateEntry.currencyId mustBe createEntry.currencyId
      updateEntry.currencyPublicId mustBe updatedCurrency.id
      updateEntry.name mustBe updatedCurrency.name
      updateEntry.verboseName mustBe updatedCurrency.verboseName
      updateEntry.symbol mustBe updatedCurrency.symbol
      updateEntry.userProjectId mustBe updateAuthContext.primaryProjectId
      updateEntry.userId mustBe updateAuthContext.userId
      updateEntry.associatedProjects mustBe updatedCurrency.associatedProjects
      updateEntry.createdAt mustBe testClock.currentUtcOffsetDateTime()
    }
  }

  private def getCurrencyChangelog(currencyId: CurrencyId): Seq[CurrencyChangelogEntry] = {
    // scalastyle:off
    import scala.concurrent.ExecutionContext.Implicits.global
    // scalastyle:on

    Await.result(walletModule.currencyRepository.getCurrencyChangelog(currencyId), awaitTimeout)
  }

  private def getCurrencyFromDatabase(currencyId: CurrencyId): Option[CurrencyEntity] = {
    // scalastyle:off
    import scala.concurrent.ExecutionContext.Implicits.global
    // scalastyle:on

    Await.result(walletModule.currencyRepository.getCurrency(currencyId), awaitTimeout)
  }

  implicit class GenOps[T](gen: Gen[T]) {
    def getOne: T = eventually {
      gen.sample.value
    }
  }
}
