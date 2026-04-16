package phoenix.http.unit

import scala.concurrent.duration._

import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.HttpOriginRange
import akka.http.scaladsl.model.headers.Origin
import akka.http.scaladsl.model.headers.`Access-Control-Allow-Credentials`
import akka.http.scaladsl.model.headers.`Access-Control-Allow-Origin`
import akka.http.scaladsl.model.headers.`Access-Control-Expose-Headers`
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.testkit.RouteTestTimeout
import akka.http.scaladsl.testkit.ScalatestRouteTest
import org.scalatest.Inspectors.forEvery
import org.scalatest.OptionValues
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.http.routes.PhoenixRestRoutes.wrapWithCors

final class CorsWrapperSpec extends AnyWordSpec with Matchers with OptionValues with ScalatestRouteTest {

  // Must be lazy since it's referenced by an overridden superclass method (`testConfigSource`),
  // which can be called by superclass constructor.
  private lazy val corsAllowedOrigin = "http://example.com"
  // This config applies to the actor system provided by akka.http.scaladsl.testkit.RouteTest#system
  // (via RoutesSpecSupport) that the entire akka-http server in this test runs over.
  override def testConfigSource: String = s"""akka-http-cors.allowed-origins = "$corsAllowedOrigin" """

  // The default is 1 second, which is apparently too low in our CI :/
  implicit val routeTestTimeout: RouteTestTimeout = RouteTestTimeout(5.seconds)

  "cors wrapper should return expected headers in each different case" in {
    val requestsToTest = Seq(
      Get("/ok"), // 200
      Get("/unauthorized"), // 401
      Get("/NON-EXISTENT"), // 404
      Post("/NON-EXISTENT"), // 404
      Put("/NON-EXISTENT"), // 404
      Put("/method-not-allowed"), // 405
      Get("/boom") // 500
    )

    val testRoutes =
      path("ok") {
        complete("Ok")
      } ~
      path("unauthorized") {
        complete(HttpResponse(StatusCodes.Unauthorized))
      } ~
      path("method-not-allowed") {
        put {
          complete(HttpResponse(StatusCodes.MethodNotAllowed))
        }
      } ~
      path("boom") {
        failWith(new NoSuchElementException("I hope you like explosions!"))
      }
    val wrappedRoutes = wrapWithCors(testRoutes)
    val sealedRoutes = Route.seal(wrappedRoutes)

    val originHeader = Origin(corsAllowedOrigin)
    forEvery(requestsToTest) { request =>
      request ~> originHeader ~> sealedRoutes ~> check {
        header[`Access-Control-Allow-Credentials`].value.allow shouldBe true

        header[`Access-Control-Allow-Origin`].value.range should matchPattern {
          case HttpOriginRange.Default(originHeader.origins) =>
        }

        header[`Access-Control-Expose-Headers`].value.headers shouldBe Seq(`Access-Control-Allow-Origin`.name)
      }
    }
  }
}
