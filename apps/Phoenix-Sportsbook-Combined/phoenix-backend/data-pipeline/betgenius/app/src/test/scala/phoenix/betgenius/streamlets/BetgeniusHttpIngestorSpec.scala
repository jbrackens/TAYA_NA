package phoenix.betgenius.streamlets

import akka.actor.ActorSystem
import akka.http.scaladsl._
import akka.http.scaladsl.model._
import akka.testkit._
import cloudflow.akkastream.testkit.scaladsl.AkkaStreamletTestKit
import com.typesafe.config.ConfigFactory
import org.scalatest.BeforeAndAfterAll
import org.scalatest.concurrent.IntegrationPatience
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.support.FutureSupport

class BetgeniusHttpIngestorSpec
    extends AnyWordSpec
    with Matchers
    with BeforeAndAfterAll
    with FutureSupport
    with IntegrationPatience {

  private implicit val system = ActorSystem("AkkaStreamletSpec")

  private val testkit = AkkaStreamletTestKit(system)
  private val streamlet = new BetgeniusHttpIngestor
  private val valid = testkit.outletAsTap(streamlet.validOut)
  private val config =
    """
      |cloudflow.internal.server.container-port = 3001
      |""".stripMargin
  private val execution =
    testkit.withConfig(ConfigFactory.parseString(config)).run(streamlet, List(), List(valid))

  override protected def beforeAll(): Unit = {
    super.beforeAll()
    await(execution.ready)
  }

  override def afterAll(): Unit = {
    TestKit.shutdownActorSystem(system)
    await(execution.stop())
    super.afterAll()
  }

  "BetgeniusHttpIngestor" should {

    "not accept malformed entities" in {
      val response =
        Http().singleRequest(HttpRequest(HttpMethods.POST, "http://localhost:3001/ingest", entity = "test")).futureValue
      response.status shouldBe StatusCodes.BadRequest
    }

    "not accept invalid entities" in {
      val response =
        Http().singleRequest(HttpRequest(HttpMethods.POST, "http://localhost:3001/ingest", entity = "{}")).futureValue
      response.status shouldBe StatusCodes.BadRequest
    }

    "direct valid entities to valid outlet" in {
      val validFixture =
        """{"Fixture":{"Competition":{"Id":13745,"Name":"[FIFA] eSports Battle","Region":{"Id":3795074,"Name":"FIFA"}},"Competitors":[{"CompetitorType":"Team","Competitors":[],"HomeAway":"Home","Id":1288944,"Name":"Atletico Madrid (NicolasRage)"},{"CompetitorType":"Team","Competitors":[],"HomeAway":"Away","Id":1301010,"Name":"Borussia Dortmund (YoungDaddy)"}],"FixtureType":"Match","Id":8565263,"Name":"Atletico Madrid (NicolasRage) v Borussia Dortmund (YoungDaddy) (Bo1)","Round":{"Id":757684,"Name":"Regular Season"},"Season":{"Id":117073,"Name":"2021 [FIFA] eSports Battle October"},"Sport":{"Id":10915624,"Name":"eSports"},"StartTimeUtc":"2021-10-08T14:12:00Z","Status":"Scheduled"},"Header":{"MessageGuid":"e373b43c-4649-46e1-a317-970759cfdcc6","Retry":0,"TimeStampUtc":"2021-10-08T14:13:44.7671916Z"}}"""

      val response = Http()
        .singleRequest(HttpRequest(HttpMethods.POST, "http://localhost:3001/ingest", entity = validFixture))
        .futureValue
      response.status shouldBe StatusCodes.OK
      valid.probe.expectMsgPF() {
        case (_, bytes: Array[Byte]) => new String(bytes) shouldBe validFixture
      }
    }
  }
}
