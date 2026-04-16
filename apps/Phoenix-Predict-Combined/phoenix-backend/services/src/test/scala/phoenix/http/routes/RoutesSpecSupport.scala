package phoenix.http.routes

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter.ClassicActorSystemOps
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.StatusCode
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.headers.OAuth2BearerToken
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.testkit.ScalatestRouteTest
import com.typesafe.config.Config
import io.circe._
import org.scalatest.Assertion
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.http.BearerToken
import phoenix.http.JsonMarshalling._
import phoenix.http.infrastructure.CirceJsonAssertions._
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.support.ConfigFactory

trait RoutesSpecSupport extends AnyWordSpec with Matchers with ScalatestRouteTest with BeforeAndAfterAll {

  implicit final val typedSystem: ActorSystem[_] = system.toTyped

  // we don't want to read full application.conf (which is the default behavior) for route tests
  override def testConfig: Config = ConfigFactory.fromConfigFile("routes-test").resolve()

  protected override def afterAll(): Unit = {
    cleanUp()
    super.afterAll()
  }

  val allMethods = Set(Get, Post, Put, Patch, Delete, Options, Head)

  def testUnauthorized(uri: String, requests: Iterable[RequestBuilder])(implicit routeUnderTest: Route): Unit =
    testResponseStatus(uri, requests, StatusCodes.Unauthorized)

  def testResponseStatus(uri: String, requests: Iterable[RequestBuilder], expectedStatus: StatusCode)(implicit
      routeUnderTest: Route): Unit = {
    requests.foreach { request =>
      s"a ${request.method.value} is attempted to $uri" in {
        request.apply(uri) ~> routeUnderTest ~> check {
          status shouldEqual expectedStatus
        }
      }
    }
  }

  def assertAdminRoleRequired(request: HttpRequest)(implicit underTest: Route): Unit = {
    "returns 401 Unauthorized for missing auth token" in {
      request ~> underTest ~> check {
        status shouldBe StatusCodes.Unauthorized
      }
    }
    "returns 403 Forbidden for non-admin role" in {
      withAuthToken(request, JwtAuthenticatorMock.punterToken) ~> underTest ~> check {
        status shouldBe StatusCodes.Forbidden
      }
    }
  }

  def assertErrorResponse(response: Json, expectedErrorCode: String): Assertion = {
    response shouldHaveField ("errors", errors => {
      val errorsCodes =
        (errors: Json).as[List[Json]].getOrElse(List()).flatMap(_.hcursor.downField("errorCode").as[String].toOption)
      errorsCodes should contain(expectedErrorCode)
    })
  }

  def withAdminToken(request: HttpRequest): HttpRequest =
    withAuthToken(request, JwtAuthenticatorMock.adminToken)

  def withAuthToken(request: HttpRequest, token: BearerToken): HttpRequest =
    request.addHeader(Authorization(OAuth2BearerToken(token.rawValue)))

  def jsonFieldDecoded[T: Decoder](name: String): Option[T] =
    responseAs[Json].hcursor.downField(name).as[T].map(Some(_)).getOrElse(None)
}
