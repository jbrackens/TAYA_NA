package phoenix.betgenius.streamlets

import akka.actor.ActorSystem
import akka.stream.scaladsl.Source
import akka.testkit._
import cloudflow.akkastream.testkit.scaladsl.AkkaStreamletTestKit
import cloudflow.akkastream.testkit.scaladsl.Completed
import io.circe.parser._
import org.scalatest.BeforeAndAfterAll
import org.scalatest.OptionValues
import org.scalatest.concurrent.IntegrationPatience
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.betgenius.domain.FixtureIngest
import phoenix.dataapi.internal.oddin.FixtureChangedEvent
import phoenix.support.FutureSupport

class BetgeniusIngestConverterSpec
    extends AnyWordSpec
    with Matchers
    with BeforeAndAfterAll
    with OptionValues
    with FutureSupport
    with IntegrationPatience {

  private implicit val system = ActorSystem("AkkaStreamletSpec")
  private val testkit = AkkaStreamletTestKit(system)

  override def afterAll(): Unit = {
    TestKit.shutdownActorSystem(system)
    super.afterAll()
  }

  "BetgeniusDataConsoleOutput" should {

    "convert fixture ingest into FixtureChangeEvent" in {
      val streamlet = new BetgeniusIngestConverter

      val json =
        """{"Fixture":{"Competition":{"Id":13745,"Name":"[FIFA] eSports Battle","Region":{"Id":3795074,"Name":"FIFA"}},"Competitors":[{"CompetitorType":"Team","Competitors":[],"HomeAway":"Home","Id":1288944,"Name":"Atletico Madrid (NicolasRage)"},{"CompetitorType":"Team","Competitors":[],"HomeAway":"Away","Id":1301010,"Name":"Borussia Dortmund (YoungDaddy)"}],"FixtureType":"Match","Id":8565263,"Name":"Atletico Madrid (NicolasRage) v Borussia Dortmund (YoungDaddy) (Bo1)","Round":{"Id":757684,"Name":"Regular Season"},"Season":{"Id":117073,"Name":"2021 [FIFA] eSports Battle October"},"Sport":{"Id":10915624,"Name":"eSports"},"StartTimeUtc":"2021-10-08T14:12:00Z","Status":"Scheduled"},"Header":{"MessageGuid":"e373b43c-4649-46e1-a317-970759cfdcc6","Retry":0,"TimeStampUtc":"2021-10-08T14:13:44.7671916Z"}}"""
      val fixtureIngest = decode[FixtureIngest](json).toOption.value
      val source = Source.single(json.getBytes())
      val fixtureEvents = testkit.outletAsTap(streamlet.fixtureEventsOut)
      val in = testkit.inletFromSource(streamlet.inlet, source)

      testkit.run(
        streamlet,
        in,
        fixtureEvents,
        () => {
          fixtureEvents.probe.expectMsgPF() {
            case (partitionId, fixtureEvent: FixtureChangedEvent) =>
              partitionId shouldEqual fixtureIngest.fixture.id.namespaced
              fixtureEvent shouldEqual fixtureIngest.toFixtureChangedEvent
          }
        })

      fixtureEvents.probe.expectMsg(Completed)
    }

    "ignore malformed input" in {
      val streamlet = new BetgeniusIngestConverter
      val json = "invalid"
      val source = Source.single(json.getBytes())
      val in = testkit.inletFromSource(streamlet.inlet, source)
      val fixtureEvents = testkit.outletAsTap(streamlet.fixtureEventsOut)

      testkit.run(
        streamlet,
        in,
        fixtureEvents,
        () => {
          fixtureEvents.probe.expectMsg(Completed)
        })
    }

    "ignore invalid json input" in {
      val streamlet = new BetgeniusIngestConverter
      val json = "{}"
      val source = Source.single(json.getBytes())
      val in = testkit.inletFromSource(streamlet.inlet, source)
      val fixtureEvents = testkit.outletAsTap(streamlet.fixtureEventsOut)

      testkit.run(
        streamlet,
        in,
        fixtureEvents,
        () => {
          fixtureEvents.probe.expectMsg(Completed)
        })
    }

  }
}
