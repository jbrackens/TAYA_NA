package phoenix.auth

import scala.concurrent.duration._

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec
import io.gatling.core.Predef._
import io.gatling.http._
import io.gatling.http.request.builder.HttpRequestBuilder

import phoenix.CommonHttpProtocol._
import phoenix.JsonOps._

class LoginLoadTest extends Simulation with HttpDsl {

  val login: HttpRequestBuilder = http("Login")
    .post(s"$restBaseUrl/login")
    .asJsonBody { session =>
      val signUpRequest = TestAccountSignup.getSignUpRequest(session)
      LoginRequest(signUpRequest.username, signUpRequest.password)
    }
    .check(status.is(200))

  val scn = scenario("SignUp -> Login")
    .feed(TestAccountSignup.signUpRequestFeeder)
    .exec(TestAccountSignup.signUp)
    .pause(10.second)
    .exec(login)

  setUp(scn.inject(atOnceUsers(10), constantUsersPerSec(5).during(10.seconds).randomized).protocols(httpProtocol))
    .assertions(details("Login").responseTime.max.lt(5000), global.successfulRequests.percent.gt(95))

}

final case class LoginRequest(username: String, password: String)
object LoginRequest {
  implicit val loginRequestCodec: Codec[LoginRequest] = deriveCodec
}
