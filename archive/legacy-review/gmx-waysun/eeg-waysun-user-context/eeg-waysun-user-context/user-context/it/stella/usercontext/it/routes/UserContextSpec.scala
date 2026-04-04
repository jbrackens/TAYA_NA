package stella.usercontext.it.routes

import io.circe.Json
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.models.Ids.UserId

import stella.usercontext.gen.Generators.jsonObjectGen
import stella.usercontext.it.utils
import stella.usercontext.it.utils.TestAuthContext
import stella.usercontext.routes.SampleObjectFactory.JsonModificationData
import stella.usercontext.routes.SampleObjectFactory._

class UserContextSpec extends RoutesSpecBase {
  private val emptyJsonObject = Json.obj()

  "getUserContextAsAdmin" should {
    "properly return empty json when user context was not yet initialised" in {
      val authContext = utils.TestAuthContext(primaryProjectId = testProjectId)
      val userId = UserId.random()
      val path = getUserContextAsAdminPath(testProjectId, userId)
      val getRequest = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
      val resultJson = sendRequestAndReturnUserContextData(getRequest, authContext)
      resultJson shouldBe emptyJsonObject
    }
  }

  "putUserContextAsAdmin" should {
    "properly set new user context" in {
      val authContext = utils.TestAuthContext(primaryProjectId = testProjectId)
      val userId = UserId.random()
      val path = getUserContextAsAdminPath(testProjectId, userId)
      val json = jsonObjectGen.sample.value
      // WHEN: we put a first version of user data
      val putRequest = FakeRequest(PUT, path, headersWithJwt, AnyContentAsJson(json))
      sendRequestWithNoResultBody(putRequest, authContext)
      // THEN: data can be fetched and it's as expected
      val getRequest = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
      val resultJson = sendRequestAndReturnUserContextData(getRequest, authContext)
      val expectedJson = toResultJson(json)
      resultJson shouldBe expectedJson
    }

    "properly replace previous user context" in {
      val authContext = utils.TestAuthContext(primaryProjectId = testProjectId)
      val userId = UserId.random()
      val path = getUserContextAsAdminPath(testProjectId, userId)
      val json = jsonObjectGen.sample.value
      val json2 = jsonObjectGen.filter(_ != json).sample.value
      // WHEN: we store user data and replace it with other data
      val putRequest = FakeRequest(PUT, path, headersWithJwt, AnyContentAsJson(json))
      sendRequestWithNoResultBody(putRequest, authContext)
      val putRequest2 = FakeRequest(PUT, path, headersWithJwt, AnyContentAsJson(json2))
      sendRequestWithNoResultBody(putRequest2, authContext)
      // THEN: data can be fetched and it's as expected
      val getRequest = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
      val resultJson = sendRequestAndReturnUserContextData(getRequest, authContext)
      val expectedJson = toResultJson(json2)
      resultJson shouldBe expectedJson
    }
  }

  "modifyUserContextAsAdmin" should {
    "properly set new user context" in {
      val authContext = utils.TestAuthContext(primaryProjectId = testProjectId)
      val userId = UserId.random()
      val path = getUserContextAsAdminPath(testProjectId, userId)
      val json = jsonObjectGen.sample.value
      // WHEN: we modify user data but data was not yet set
      val patchRequest = FakeRequest(PATCH, path, headersWithJwt, AnyContentAsJson(json))
      sendRequestWithNoResultBody(patchRequest, authContext)
      // THEN: data can be fetched and it's as expected
      val getRequest = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
      val resultJson = sendRequestAndReturnUserContextData(getRequest, authContext)
      val expectedJson = toResultJson(json)
      resultJson shouldBe expectedJson
    }

    "properly update previous user context" in {
      val authContext = utils.TestAuthContext(primaryProjectId = testProjectId)
      val userId = UserId.random()
      val path = getUserContextAsAdminPath(testProjectId, userId)
      val initialJson = toPlayJson(JsonModificationData.initialJson)
      val jsonDiff = toPlayJson(JsonModificationData.jsonDiff)
      val expectedJson = JsonModificationData.finalJson
      // WHEN: we store user data and update it with other data
      val putRequest = FakeRequest(PUT, path, headersWithJwt, AnyContentAsJson(initialJson))
      sendRequestWithNoResultBody(putRequest, authContext)
      val patchRequest = FakeRequest(PATCH, path, headersWithJwt, AnyContentAsJson(jsonDiff))
      sendRequestWithNoResultBody(patchRequest, authContext)
      // THEN: data can be fetched and it's as expected
      val getRequest = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
      val resultJson = sendRequestAndReturnUserContextData(getRequest, authContext)
      resultJson shouldBe expectedJson
    }
  }

  "deleteUserContextAsAdmin" should {
    "work even when user context was not yet initialised" in {
      val authContext = utils.TestAuthContext(primaryProjectId = testProjectId)
      val userId = UserId.random()
      val path = getUserContextAsAdminPath(testProjectId, userId)
      testDeleteOperation(authContext, path)
    }

    "remove previously set context" in {
      val authContext = utils.TestAuthContext(primaryProjectId = testProjectId)
      val userId = UserId.random()
      val path = getUserContextAsAdminPath(testProjectId, userId)
      val json = jsonObjectGen.sample.value
      val putRequest = FakeRequest(PUT, path, headersWithJwt, AnyContentAsJson(json))
      sendRequestWithNoResultBody(putRequest, authContext)
      testDeleteOperation(authContext, path)
    }
  }

  "getUserContext" should {
    "properly return empty json when user context was not yet initialised" in {
      val authContext = TestAuthContext()
      val getRequest = FakeRequest(GET, userContextPath, headersWithJwt, AnyContentAsEmpty)
      val resultJson = sendRequestAndReturnUserContextData(getRequest, authContext)
      resultJson shouldBe emptyJsonObject
    }
  }

  "putUserContext" should {
    "properly set new user context" in {
      val authContext = TestAuthContext()
      val json = jsonObjectGen.sample.value
      // WHEN: we put a first version of user data
      val putRequest = FakeRequest(PUT, userContextPath, headersWithJwt, AnyContentAsJson(json))
      sendRequestWithNoResultBody(putRequest, authContext)
      // THEN: data can be fetched and it's as expected
      val getRequest = FakeRequest(GET, userContextPath, headersWithJwt, AnyContentAsEmpty)
      val resultJson = sendRequestAndReturnUserContextData(getRequest, authContext)
      val expectedJson = toResultJson(json)
      resultJson shouldBe expectedJson
    }

    "properly update previous user context" in {
      val authContext = TestAuthContext()
      val json = jsonObjectGen.sample.value
      val json2 = jsonObjectGen.filter(_ != json).sample.value
      // WHEN: we store user data and replace it with other data
      val putRequest = FakeRequest(PUT, userContextPath, headersWithJwt, AnyContentAsJson(json))
      sendRequestWithNoResultBody(putRequest, authContext)
      val putRequest2 = FakeRequest(PUT, userContextPath, headersWithJwt, AnyContentAsJson(json2))
      sendRequestWithNoResultBody(putRequest2, authContext)
      // THEN: data can be fetched and it's as expected
      val getRequest = FakeRequest(GET, userContextPath, headersWithJwt, AnyContentAsEmpty)
      val resultJson = sendRequestAndReturnUserContextData(getRequest, authContext)
      val expectedJson = toResultJson(json2)
      resultJson shouldBe expectedJson
    }
  }

  "modifyUserContext" should {
    "properly set new user context" in {
      val authContext = TestAuthContext()
      val json = jsonObjectGen.sample.value
      // WHEN: we modify user data but data was not yet set
      val patchRequest = FakeRequest(PATCH, userContextPath, headersWithJwt, AnyContentAsJson(json))
      sendRequestWithNoResultBody(patchRequest, authContext)
      // THEN: data can be fetched and it's as expected
      val getRequest = FakeRequest(GET, userContextPath, headersWithJwt, AnyContentAsEmpty)
      val resultJson = sendRequestAndReturnUserContextData(getRequest, authContext)
      val expectedJson = toResultJson(json)
      resultJson shouldBe expectedJson
    }

    "properly replace previous user context" in {
      val authContext = TestAuthContext()
      val initialJson = toPlayJson(JsonModificationData.initialJson)
      val jsonDiff = toPlayJson(JsonModificationData.jsonDiff)
      val expectedJson = JsonModificationData.finalJson
      // WHEN: we store user data and update it with other data
      val putRequest = FakeRequest(PUT, userContextPath, headersWithJwt, AnyContentAsJson(initialJson))
      sendRequestWithNoResultBody(putRequest, authContext)
      val patchRequest = FakeRequest(PATCH, userContextPath, headersWithJwt, AnyContentAsJson(jsonDiff))
      sendRequestWithNoResultBody(patchRequest, authContext)
      // THEN: data can be fetched and it's as expected
      val getRequest = FakeRequest(GET, userContextPath, headersWithJwt, AnyContentAsEmpty)
      val resultJson = sendRequestAndReturnUserContextData(getRequest, authContext)
      resultJson shouldBe expectedJson
    }
  }

  "deleteUserContext" should {
    "work even when user context was not yet initialised" in {
      val authContext = TestAuthContext()
      testDeleteOperation(authContext, userContextPath)
    }

    "remove previously set context" in {
      val authContext = TestAuthContext()
      val json = jsonObjectGen.sample.value
      val putRequest = FakeRequest(PUT, userContextPath, headersWithJwt, AnyContentAsJson(json))
      sendRequestWithNoResultBody(putRequest, authContext)
      testDeleteOperation(authContext, userContextPath)
    }
  }

  private def testDeleteOperation(authContext: TestAuthContext, path: String) = {
    val deleteRequest = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
    sendRequestWithNoResultBody(deleteRequest, authContext, expectedStatusCode = NO_CONTENT)
    val getRequest = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
    val resultJson = sendRequestAndReturnUserContextData(getRequest, authContext)
    resultJson shouldBe emptyJsonObject
  }
}
