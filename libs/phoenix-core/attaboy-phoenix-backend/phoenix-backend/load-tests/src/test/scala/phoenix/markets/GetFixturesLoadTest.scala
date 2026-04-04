package phoenix.markets

import scala.concurrent.duration._

import io.gatling.core.Predef._
import io.gatling.http._
import io.gatling.http.request.builder.HttpRequestBuilder

import phoenix.CommonHttpProtocol._

class GetFixturesLoadTest extends Simulation with HttpDsl {

  val getFixtures: HttpRequestBuilder =
    http("Get fixtures").get(s"$restBaseUrl/fixtures").check(status.is(200))

  val scn = scenario("Fixtures").exec(getFixtures)

  setUp(scn.inject(atOnceUsers(20), constantUsersPerSec(10).during(15.seconds).randomized).protocols(httpProtocol))
    .assertions(global.responseTime.max.lt(1200), global.successfulRequests.percent.gt(95))

}
