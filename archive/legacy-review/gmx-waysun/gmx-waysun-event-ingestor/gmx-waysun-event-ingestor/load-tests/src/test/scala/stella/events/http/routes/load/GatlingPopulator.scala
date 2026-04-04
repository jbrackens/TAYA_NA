package stella.events.http.routes.load

import scala.concurrent.duration._

import io.gatling.core.Predef._
import io.gatling.core.body.Body
import io.gatling.core.structure.ScenarioBuilder
import io.gatling.http.Predef.http
import io.gatling.http.protocol.HttpProtocolBuilder

// for manual tests / experiments
class GatlingPopulator extends Simulation {
  private val usersPerSec = 1000
  private val loadDuration = 30.seconds
  private val headers =
    Map("Accept" -> "application/json", "Authorization" -> "Bearer _some-jwt_", "Content-Type" -> "application/json")

  private val httpProtocol: HttpProtocolBuilder =
    http.baseUrl("http://localhost:9000/event_ingestor").headers(headers)

  private val json: Body = PebbleStringBody("""{
               |  "messageOriginDateUTC": "2021-09-12T19:37:23.091Z",
               |  "eventName": "string",
               |  "payload": [
               |    {
               |      "name": "field_name",
               |      "value": "field_value"
               |    }
               |  ]
               |}""".stripMargin)
  private val gatlingScenario: ScenarioBuilder =
    scenario("Send event").exec(http("send event").post("/event").body(json).asJson)

  setUp(gatlingScenario.inject(constantUsersPerSec(usersPerSec).during(loadDuration)).protocols(httpProtocol))
}
