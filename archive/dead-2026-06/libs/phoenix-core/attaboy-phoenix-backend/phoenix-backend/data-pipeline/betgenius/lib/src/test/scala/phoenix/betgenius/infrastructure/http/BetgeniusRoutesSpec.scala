package phoenix.betgenius.infrastructure.http
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter.ClassicActorSystemOps
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.testkit.ScalatestRouteTest
import akka.stream.OverflowStrategy
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.testkit.TestProbe
import io.circe.Json
import io.circe.parser.decode
import org.scalatest.OptionValues
import org.scalatest.concurrent.IntegrationPatience
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.betgenius.domain.FixtureIngest
import phoenix.betgenius.domain.Ingest
import phoenix.betgenius.infrastructure.BetgeniusFeed
import phoenix.http.JsonMarshalling._
import phoenix.support.FutureSupport

class BetgeniusRoutesSpec
    extends AnyWordSpec
    with Matchers
    with ScalatestRouteTest
    with FutureSupport
    with IntegrationPatience
    with OptionValues {

  private implicit final val typedSystem: ActorSystem[_] = system.toTyped

  private val (queue, source) = Source.queue[Ingest](10, OverflowStrategy.dropHead).preMaterialize()
  private val probe = TestProbe()

  "Betgenius routes" when {

    "calling POST /heartbeat" should {

      "returns 200 OK for successful heartbeat request" in {
        Post("/heartbeat") ~> underTest ~> check {
          status shouldEqual StatusCodes.OK
        }
      }
    }

    "calling POST /ingest" should {

      "returns 400 OK for invalid ingest payload" in {
        val payload = Json.obj("test" -> Json.fromString("test"))
        Post("/ingest", payload) ~> underTest ~> check {
          status shouldEqual StatusCodes.BadRequest
        }
      }

      "returns 400 OK for malformed ingest payload" in {
        val payload = Json.obj("test" -> Json.fromString("test"))
        Post("/ingest", payload) ~> underTest ~> check {
          status shouldEqual StatusCodes.BadRequest
        }
      }

      "returns 200 OK for valid ingest and publish it to the feed" in {
        val json =
          """{"Fixture":{"Competition":{"Id":13745,"Name":"[FIFA] eSports Battle","Region":{"Id":3795074,"Name":"FIFA"}},"Competitors":[{"CompetitorType":"Team","Competitors":[],"HomeAway":"Home","Id":1288944,"Name":"Atletico Madrid (NicolasRage)"},{"CompetitorType":"Team","Competitors":[],"HomeAway":"Away","Id":1301010,"Name":"Borussia Dortmund (YoungDaddy)"}],"FixtureType":"Match","Id":8565263,"Name":"Atletico Madrid (NicolasRage) v Borussia Dortmund (YoungDaddy) (Bo1)","Round":{"Id":757684,"Name":"Regular Season"},"Season":{"Id":117073,"Name":"2021 [FIFA] eSports Battle October"},"Sport":{"Id":10915624,"Name":"eSports"},"StartTimeUtc":"2021-10-08T14:12:00Z","Status":"Scheduled"},"Header":{"MessageGuid":"e373b43c-4649-46e1-a317-970759cfdcc6","Retry":0,"TimeStampUtc":"2021-10-08T14:13:44.7671916Z"}}"""
        val fixtureIngest = decode[FixtureIngest](json).toOption.value

        source.to(Sink.actorRef(probe.ref, onCompleteMessage = "completed", onFailureMessage = _.getMessage)).run()

        Post("/ingest", json) ~> underTest ~> check {
          status shouldEqual StatusCodes.OK

          probe.expectMsg(fixtureIngest)
          queue.complete()
          probe.expectMsg("completed")
        }
      }
    }
  }

  private val feed = new BetgeniusFeed(queue)
  private lazy val underTest: Route = Route.seal(new BetgeniusRoutes(feed).toAkkaHttp)
}
