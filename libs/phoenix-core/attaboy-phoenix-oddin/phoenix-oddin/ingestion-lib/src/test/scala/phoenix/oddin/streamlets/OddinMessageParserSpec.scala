package phoenix.oddin.streamlets

import java.util.UUID

import akka.actor._
import akka.stream._
import akka.stream.scaladsl._
import akka.testkit._
import org.scalatest._
import org.scalatest.concurrent._
import cloudflow.streamlets._
import cloudflow.streamlets.avro._
import cloudflow.akkastream._
import cloudflow.akkastream.scaladsl._
import cloudflow.akkastream.testkit._
import cloudflow.akkastream.testkit.scaladsl._
import org.scalatest.matchers.must
import phoenix.oddin.data.OddinMessage

class OddinMessageParserSpec extends WordSpec with must.Matchers with BeforeAndAfterAll {
  import OddinMessageParserSpec._

  private implicit val system = ActorSystem("AkkaStreamletSpec")
  private implicit val mat = ActorMaterializer()

  override def afterAll: Unit = {
    TestKit.shutdownActorSystem(system)
  }

  "An OddinMessageParser" should {

    val testkit = AkkaStreamletTestKit(system)

    "process OddsChange messages" in {
      val data = OddinMessage(UUID.randomUUID().toString, OddsChange)
      val source = Source(List(data))
      val parser = new OddinMessageParser
      val in = testkit.inletFromSource(parser.in, source)
      val oddsChangesOut = testkit.outletAsTap(parser.oddsChangesOut)
      val fixtureChangesOut = testkit.outletAsTap(parser.fixtureChangesOut)
      val unparsableMessagesOut = testkit.outletAsTap(parser.unparsableMessagesOut)

      testkit.run(
        parser,
        in,
        List(oddsChangesOut, fixtureChangesOut, unparsableMessagesOut),
        () => {
//          fixtureChangesOut.probe.expectNoMessage()
//          unparsableMessagesOut.probe.expectNoMessage()
//          oddsChangesOut.probe.receiveN(1) mustBe "hello"
        })
    }
  }
}

object OddinMessageParserSpec {

  val OddsChange =
    """
      |<odds_change timestamp="1604935063807" event_id="od:match:19854" product="2" request_id="17469">
      |    <sport_event_status home_score="0" away_score="0" status="0" scoreboard_available="false" match_status="0">
      |        <period_scores>
      |            <period_score type="map" number="1" match_status_code="51" home_score="0" away_score="0"></period_score>
      |            <period_score type="map" number="2" match_status_code="52" home_score="0" away_score="0"></period_score>
      |            <period_score type="map" number="3" match_status_code="53" home_score="0" away_score="0"></period_score>
      |        </period_scores>
      |    </sport_event_status>
      |    <odds>
      |        <market id="34" specifiers="map=2|threshold=30.5" status="1">
      |            <outcome id="5" odds="2.32" active="1"></outcome>
      |            <outcome id="4" odds="1.55" active="1"></outcome>
      |        </market>
      |        <market id="3" specifiers="threshold=2.5" status="1">
      |            <outcome id="5" odds="1.9" active="1"></outcome>
      |            <outcome id="4" odds="1.83" active="1"></outcome>
      |        </market>
      |        <market id="36" specifiers="map=1|threshold=12.5" status="1">
      |            <outcome id="5" odds="2.23" active="1"></outcome>
      |            <outcome id="4" odds="1.57" active="1"></outcome>
      |        </market>
      |        <market id="29" specifiers="map=3" status="1">
      |            <outcome id="7" odds="1.03" active="0"></outcome>
      |            <outcome id="6" odds="9.4" active="1"></outcome>
      |        </market>
      |        <market id="44" specifiers="map=1|kind=infernal" status="1">
      |            <outcome id="7" odds="3.35" active="1"></outcome>
      |            <outcome id="6" odds="1.27" active="1"></outcome>
      |        </market>
      |        <market id="27" specifiers="map=3|threshold=36" status="-1">
      |            <outcome id="5" active="0"></outcome>
      |            <outcome id="4" active="0"></outcome>
      |        </market>
      |        <market id="27" specifiers="map=3|threshold=40" status="-1">
      |            <outcome id="5" active="0"></outcome>
      |            <outcome id="4" active="0"></outcome>
      |        </market>
      |        <market id="44" specifiers="map=3|kind=ocean" status="1">
      |            <outcome id="7" odds="3.35" active="1"></outcome>
      |            <outcome id="6" odds="1.27" active="1"></outcome>
      |        </market>
      |        <market id="34" specifiers="map=3|threshold=30.5" status="1">
      |            <outcome id="5" odds="2.32" active="1"></outcome>
      |            <outcome id="4" odds="1.55" active="1"></outcome>
      |        </market>
      |        <market id="27" specifiers="map=1|threshold=40" status="-1">
      |            <outcome id="5" active="0"></outcome>
      |            <outcome id="4" active="0"></outcome>
      |        </market>
      |        <market id="14" specifiers="map=2" status="1">
      |            <outcome id="2" odds="2.09" active="1"></outcome>
      |            <outcome id="1" odds="1.68" active="1"></outcome>
      |        </market>
      |        <market id="23" specifiers="map=1|threshold=10" status="1">
      |            <outcome id="2" odds="1.94" active="1"></outcome>
      |            <outcome id="1" odds="1.76" active="1"></outcome>
      |        </market>
      |        <market id="27" specifiers="map=1|threshold=32" status="-1">
      |            <outcome id="5" active="0"></outcome>
      |            <outcome id="4" active="0"></outcome>
      |        </market>
      |        <market id="16" specifiers="map=1" status="1">
      |            <outcome id="2" odds="1.9" active="1"></outcome>
      |            <outcome id="1" odds="1.79" active="1"></outcome>
      |        </market>
      |        <market id="37" specifiers="side=away" status="1">
      |            <outcome id="7" odds="2.75" active="1"></outcome>
      |            <outcome id="6" odds="1.42" active="1"></outcome>
      |        </market>
      |        <market id="44" specifiers="map=2|kind=cloud" status="1">
      |            <outcome id="7" odds="3.35" active="1"></outcome>
      |            <outcome id="6" odds="1.27" active="1"></outcome>
      |        </market>
      |        <market id="1" specifiers="variant=way:two|way=two" status="1">
      |            <outcome id="2" odds="2.23" active="1"></outcome>
      |            <outcome id="1" odds="1.57" active="1"></outcome>
      |        </market>
      |        <market id="23" specifiers="map=3|threshold=20" status="1">
      |            <outcome id="2" odds="1.94" active="1"></outcome>
      |            <outcome id="1" odds="1.76" active="1"></outcome>
      |        </market>
      |        <market id="38" specifiers="threshold=10|map=2" status="1">
      |            <outcome id="2" odds="2.05" active="1"></outcome>
      |            <outcome id="1" odds="1.68" active="1"></outcome>
      |        </market>
      |        <market id="42" specifiers="map=2|order=1" status="1">
      |            <outcome id="66" odds="3.35" active="1"></outcome>
      |            <outcome id="65" odds="3.35" active="1"></outcome>
      |            <outcome id="64" odds="3.35" active="1"></outcome>
      |            <outcome id="63" odds="3.35" active="1"></outcome>
      |        </market>
      |        <market id="34" specifiers="map=3|threshold=18.5" status="1">
      |            <outcome id="5" odds="1.19" active="1"></outcome>
      |            <outcome id="4" odds="4.16" active="1"></outcome>
      |        </market>
      |        <market id="18" specifiers="map=1" status="1">
      |            <outcome id="2" odds="2.09" active="1"></outcome>
      |            <outcome id="1" odds="1.65" active="1"></outcome>
      |        </market>
      |        <market id="20" specifiers="map=3" status="1">
      |            <outcome id="2" odds="1.94" active="1"></outcome>
      |            <outcome id="1" odds="1.76" active="1"></outcome>
      |        </market>
      |        <market id="2" specifiers="handicap=-1.5" status="1">
      |            <outcome id="2" odds="4.36" active="1"></outcome>
      |            <outcome id="1" odds="1.17" active="1"></outcome>
      |        </market>
      |        <market id="14" specifiers="map=3" status="1">
      |            <outcome id="2" odds="2" active="1"></outcome>
      |            <outcome id="1" odds="1.7" active="1"></outcome>
      |        </market>
      |        <market id="18" specifiers="map=2" status="1">
      |            <outcome id="2" odds="2.14" active="1"></outcome>
      |            <outcome id="1" odds="1.65" active="1"></outcome>
      |        </market>
      |        <market id="27" specifiers="threshold=32|map=3" status="-1">
      |            <outcome id="5" active="0"></outcome>
      |            <outcome id="4" active="0"></outcome>
      |        </market>
      |        <market id="36" specifiers="map=2|threshold=12.5" status="1">
      |            <outcome id="5" odds="2.23" active="1"></outcome>
      |            <outcome id="4" odds="1.57" active="1"></outcome>
      |        </market>
      |        <market id="38" specifiers="map=3|threshold=10" status="1">
      |            <outcome id="2" odds="2" active="1"></outcome>
      |            <outcome id="1" odds="1.73" active="1"></outcome>
      |        </market>
      |        <market id="42" specifiers="order=1|map=3" status="1">
      |            <outcome id="66" odds="3.35" active="1"></outcome>
      |            <outcome id="65" odds="3.35" active="1"></outcome>
      |            <outcome id="64" odds="3.35" active="1"></outcome>
      |            <outcome id="63" odds="3.35" active="1"></outcome>
      |        </market>
      |        <market id="35" specifiers="map=3" status="1">
      |            <outcome id="61" odds="1.86" active="1"></outcome>
      |            <outcome id="60" odds="1.86" active="1"></outcome>
      |        </market>
      |        <market id="20" specifiers="map=2" status="1">
      |            <outcome id="2" odds="1.98" active="1"></outcome>
      |            <outcome id="1" odds="1.73" active="1"></outcome>
      |        </market>
      |        <market id="23" specifiers="map=1|threshold=30" status="1">
      |            <outcome id="2" odds="2" active="1"></outcome>
      |            <outcome id="1" odds="1.73" active="1"></outcome>
      |        </market>
      |        <market id="23" specifiers="map=2|threshold=10" status="1">
      |            <outcome id="2" odds="1.94" active="1"></outcome>
      |            <outcome id="1" odds="1.76" active="1"></outcome>
      |        </market>
      |        <market id="35" specifiers="map=2" status="1">
      |            <outcome id="61" odds="1.86" active="1"></outcome>
      |            <outcome id="60" odds="1.86" active="1"></outcome>
      |        </market>
      |        <market id="43" specifiers="map=2" status="1">
      |            <outcome id="66" odds="3.35" active="1"></outcome>
      |            <outcome id="65" odds="3.35" active="1"></outcome>
      |            <outcome id="64" odds="3.35" active="1"></outcome>
      |            <outcome id="63" odds="3.35" active="1"></outcome>
      |        </market>
      |        <market id="37" specifiers="side=home" status="1">
      |            <outcome id="7" odds="4.36" active="1"></outcome>
      |            <outcome id="6" odds="1.17" active="1"></outcome>
      |        </market>
      |        <market id="35" specifiers="map=1" status="1">
      |            <outcome id="61" odds="1.86" active="1"></outcome>
      |            <outcome id="60" odds="1.86" active="1"></outcome>
      |        </market>
      |        <market id="44" specifiers="map=2|kind=ocean" status="1">
      |            <outcome id="7" odds="3.35" active="1"></outcome>
      |            <outcome id="6" odds="1.27" active="1"></outcome>
      |        </market>
      |        <market id="16" specifiers="map=2" status="1">
      |            <outcome id="2" odds="1.9" active="1"></outcome>
      |            <outcome id="1" odds="1.79" active="1"></outcome>
      |        </market>
      |        <market id="27" specifiers="map=2|threshold=36" status="-1">
      |            <outcome id="5" active="0"></outcome>
      |            <outcome id="4" active="0"></outcome>
      |        </market>
      |        <market id="42" specifiers="map=1|order=2" status="1">
      |            <outcome id="66" odds="3.35" active="1"></outcome>
      |            <outcome id="65" odds="3.35" active="1"></outcome>
      |            <outcome id="64" odds="3.35" active="1"></outcome>
      |            <outcome id="63" odds="3.35" active="1"></outcome>
      |        </market>
      |        <market id="6" specifiers="variant=way:two|map=3|way=two" status="1">
      |            <outcome id="2" odds="2.05" active="1"></outcome>
      |            <outcome id="1" odds="1.68" active="1"></outcome>
      |        </market>
      |        <market id="17" specifiers="map=3" status="1">
      |            <outcome id="2" odds="1.94" active="1"></outcome>
      |            <outcome id="1" odds="1.79" active="1"></outcome>
      |        </market>
      |        <market id="34" specifiers="map=2|threshold=22.5" status="1">
      |            <outcome id="5" odds="1.42" active="1"></outcome>
      |            <outcome id="4" odds="2.68" active="1"></outcome>
      |        </market>
      |        <market id="27" specifiers="map=2|threshold=32" status="-1">
      |            <outcome id="5" active="0"></outcome>
      |            <outcome id="4" active="0"></outcome>
      |        </market>
      |        <market id="34" specifiers="map=2|threshold=18.5" status="1">
      |            <outcome id="5" odds="1.19" active="1"></outcome>
      |            <outcome id="4" odds="4.16" active="1"></outcome>
      |        </market>
      |        <market id="4" specifiers="variant=best_of:3|best_of=3" status="1">
      |            <outcome id="12" odds="3.24" active="1"></outcome>
      |            <outcome id="11" odds="3.8" active="1"></outcome>
      |            <outcome id="10" odds="2.75" active="1"></outcome>
      |            <outcome id="8" odds="4.36" active="1"></outcome>
      |        </market>
      |        <market id="42" specifiers="map=1|order=1" status="1">
      |            <outcome id="66" odds="3.35" active="1"></outcome>
      |            <outcome id="65" odds="3.35" active="1"></outcome>
      |            <outcome id="64" odds="3.35" active="1"></outcome>
      |            <outcome id="63" odds="3.35" active="1"></outcome>
      |        </market>
      |        <market id="23" specifiers="threshold=20|map=1" status="1">
      |            <outcome id="2" odds="1.98" active="1"></outcome>
      |            <outcome id="1" odds="1.73" active="1"></outcome>
      |        </market>
      |        <market id="34" specifiers="map=1|threshold=22.5" status="1">
      |            <outcome id="5" odds="1.42" active="1"></outcome>
      |            <outcome id="4" odds="2.68" active="1"></outcome>
      |        </market>
      |        <market id="2" specifiers="handicap=1.5" status="1">
      |            <outcome id="2" odds="1.42" active="1"></outcome>
      |            <outcome id="1" odds="2.75" active="1"></outcome>
      |        </market>
      |        <market id="16" specifiers="map=3" status="1">
      |            <outcome id="2" odds="1.9" active="1"></outcome>
      |            <outcome id="1" odds="1.79" active="1"></outcome>
      |        </market>
      |        <market id="44" specifiers="map=3|kind=mountain" status="1">
      |            <outcome id="7" odds="3.35" active="1"></outcome>
      |            <outcome id="6" odds="1.27" active="1"></outcome>
      |        </market>
      |        <market id="14" specifiers="map=1" status="1">
      |            <outcome id="2" odds="2.05" active="1"></outcome>
      |            <outcome id="1" odds="1.68" active="1"></outcome>
      |        </market>
      |        <market id="38" specifiers="map=2|threshold=15" status="1">
      |            <outcome id="2" odds="2.14" active="1"></outcome>
      |            <outcome id="1" odds="1.62" active="1"></outcome>
      |        </market>
      |        <market id="44" specifiers="map=1|kind=ocean" status="1">
      |            <outcome id="7" odds="3.35" active="1"></outcome>
      |            <outcome id="6" odds="1.27" active="1"></outcome>
      |        </market>
      |        <market id="38" specifiers="threshold=15|map=3" status="1">
      |            <outcome id="2" odds="2.09" active="1"></outcome>
      |            <outcome id="1" odds="1.68" active="1"></outcome>
      |        </market>
      |        <market id="38" specifiers="map=1|threshold=10" status="1">
      |            <outcome id="2" odds="2.05" active="1"></outcome>
      |            <outcome id="1" odds="1.7" active="1"></outcome>
      |        </market>
      |        <market id="23" specifiers="map=2|threshold=20" status="1">
      |            <outcome id="2" odds="1.98" active="1"></outcome>
      |            <outcome id="1" odds="1.73" active="1"></outcome>
      |        </market>
      |        <market id="6" specifiers="variant=way:two|map=2|way=two" status="1">
      |            <outcome id="2" odds="2.14" active="1"></outcome>
      |            <outcome id="1" odds="1.65" active="1"></outcome>
      |        </market>
      |        <market id="44" specifiers="map=3|kind=cloud" status="1">
      |            <outcome id="7" odds="3.35" active="1"></outcome>
      |            <outcome id="6" odds="1.27" active="1"></outcome>
      |        </market>
      |        <market id="34" specifiers="threshold=26.5|map=1" status="1">
      |            <outcome id="5" odds="1.76" active="1"></outcome>
      |            <outcome id="4" odds="1.94" active="1"></outcome>
      |        </market>
      |        <market id="43" specifiers="map=3" status="1">
      |            <outcome id="66" odds="3.35" active="1"></outcome>
      |            <outcome id="65" odds="3.35" active="1"></outcome>
      |            <outcome id="64" odds="3.35" active="1"></outcome>
      |            <outcome id="63" odds="3.35" active="1"></outcome>
      |        </market>
      |        <market id="38" specifiers="threshold=5|map=3" status="1">
      |            <outcome id="2" odds="1.98" active="1"></outcome>
      |            <outcome id="1" odds="1.76" active="1"></outcome>
      |        </market>
      |        <market id="34" specifiers="map=1|threshold=18.5" status="1">
      |            <outcome id="5" odds="1.19" active="1"></outcome>
      |            <outcome id="4" odds="4.16" active="1"></outcome>
      |        </market>
      |        <market id="34" specifiers="threshold=30.5|map=1" status="1">
      |            <outcome id="5" odds="2.32" active="1"></outcome>
      |            <outcome id="4" odds="1.55" active="1"></outcome>
      |        </market>
      |        <market id="43" specifiers="map=1" status="1">
      |            <outcome id="66" odds="3.35" active="1"></outcome>
      |            <outcome id="65" odds="3.35" active="1"></outcome>
      |            <outcome id="64" odds="3.35" active="1"></outcome>
      |            <outcome id="63" odds="3.35" active="1"></outcome>
      |        </market>
      |        <market id="38" specifiers="map=2|threshold=5" status="1">
      |            <outcome id="2" odds="2" active="1"></outcome>
      |            <outcome id="1" odds="1.73" active="1"></outcome>
      |        </market>
      |        <market id="38" specifiers="map=1|threshold=5" status="1">
      |            <outcome id="2" odds="2" active="1"></outcome>
      |            <outcome id="1" odds="1.73" active="1"></outcome>
      |        </market>
      |        <market id="23" specifiers="map=2|threshold=30" status="1">
      |            <outcome id="2" odds="2" active="1"></outcome>
      |            <outcome id="1" odds="1.7" active="1"></outcome>
      |        </market>
      |        <market id="34" specifiers="map=2|threshold=26.5" status="1">
      |            <outcome id="5" odds="1.76" active="1"></outcome>
      |            <outcome id="4" odds="1.94" active="1"></outcome>
      |        </market>
      |        <market id="20" specifiers="map=1" status="1">
      |            <outcome id="2" odds="1.98" active="1"></outcome>
      |            <outcome id="1" odds="1.76" active="1"></outcome>
      |        </market>
      |        <market id="27" specifiers="map=2|threshold=40" status="-1">
      |            <outcome id="5" active="0"></outcome>
      |            <outcome id="4" active="0"></outcome>
      |        </market>
      |        <market id="27" specifiers="map=3|threshold=28" status="-1">
      |            <outcome id="5" active="0"></outcome>
      |            <outcome id="4" active="0"></outcome>
      |        </market>
      |        <market id="29" specifiers="map=2" status="1">
      |            <outcome id="7" odds="1.03" active="0"></outcome>
      |            <outcome id="6" odds="9.4" active="1"></outcome>
      |        </market>
      |        <market id="23" specifiers="map=3|threshold=10" status="1">
      |            <outcome id="2" odds="1.94" active="1"></outcome>
      |            <outcome id="1" odds="1.79" active="1"></outcome>
      |        </market>
      |        <market id="36" specifiers="map=3|threshold=12.5" status="1">
      |            <outcome id="5" odds="2.23" active="1"></outcome>
      |            <outcome id="4" odds="1.57" active="1"></outcome>
      |        </market>
      |        <market id="44" specifiers="map=2|kind=infernal" status="1">
      |            <outcome id="7" odds="3.35" active="1"></outcome>
      |            <outcome id="6" odds="1.27" active="1"></outcome>
      |        </market>
      |        <market id="44" specifiers="map=1|kind=mountain" status="1">
      |            <outcome id="7" odds="3.35" active="1"></outcome>
      |            <outcome id="6" odds="1.27" active="1"></outcome>
      |        </market>
      |        <market id="17" specifiers="map=1" status="1">
      |            <outcome id="2" odds="1.94" active="1"></outcome>
      |            <outcome id="1" odds="1.76" active="1"></outcome>
      |        </market>
      |        <market id="30" specifiers="map=2" status="1">
      |            <outcome id="7" odds="1" active="0"></outcome>
      |            <outcome id="6" odds="12.7" active="1"></outcome>
      |        </market>
      |        <market id="44" specifiers="map=2|kind=mountain" status="1">
      |            <outcome id="7" odds="3.35" active="1"></outcome>
      |            <outcome id="6" odds="1.27" active="1"></outcome>
      |        </market>
      |        <market id="38" specifiers="map=1|threshold=15" status="1">
      |            <outcome id="2" odds="2.14" active="1"></outcome>
      |            <outcome id="1" odds="1.65" active="1"></outcome>
      |        </market>
      |        <market id="23" specifiers="map=3|threshold=30" status="1">
      |            <outcome id="2" odds="1.98" active="1"></outcome>
      |            <outcome id="1" odds="1.73" active="1"></outcome>
      |        </market>
      |        <market id="27" specifiers="threshold=28|map=1" status="-1">
      |            <outcome id="5" active="0"></outcome>
      |            <outcome id="4" active="0"></outcome>
      |        </market>
      |        <market id="44" specifiers="map=1|kind=cloud" status="1">
      |            <outcome id="7" odds="3.35" active="1"></outcome>
      |            <outcome id="6" odds="1.27" active="1"></outcome>
      |        </market>
      |        <market id="27" specifiers="map=2|threshold=28" status="-1">
      |            <outcome id="5" active="0"></outcome>
      |            <outcome id="4" active="0"></outcome>
      |        </market>
      |        <market id="34" specifiers="threshold=22.5|map=3" status="1">
      |            <outcome id="5" odds="1.42" active="1"></outcome>
      |            <outcome id="4" odds="2.68" active="1"></outcome>
      |        </market>
      |        <market id="44" specifiers="map=3|kind=infernal" status="1">
      |            <outcome id="7" odds="3.35" active="1"></outcome>
      |            <outcome id="6" odds="1.27" active="1"></outcome>
      |        </market>
      |        <market id="6" specifiers="variant=way:two|map=1|way=two" status="1">
      |            <outcome id="2" odds="2.09" active="1"></outcome>
      |            <outcome id="1" odds="1.65" active="1"></outcome>
      |        </market>
      |        <market id="34" specifiers="map=3|threshold=26.5" status="1">
      |            <outcome id="5" odds="1.76" active="1"></outcome>
      |            <outcome id="4" odds="1.94" active="1"></outcome>
      |        </market>
      |        <market id="29" specifiers="map=1" status="1">
      |            <outcome id="7" odds="1.03" active="0"></outcome>
      |            <outcome id="6" odds="9.4" active="1"></outcome>
      |        </market>
      |        <market id="27" specifiers="map=1|threshold=36" status="-1">
      |            <outcome id="5" active="0"></outcome>
      |            <outcome id="4" active="0"></outcome>
      |        </market>
      |        <market id="30" specifiers="map=3" status="1">
      |            <outcome id="7" odds="1" active="0"></outcome>
      |            <outcome id="6" odds="12.7" active="1"></outcome>
      |        </market>
      |        <market id="42" specifiers="map=2|order=2" status="1">
      |            <outcome id="66" odds="3.35" active="1"></outcome>
      |            <outcome id="65" odds="3.35" active="1"></outcome>
      |            <outcome id="64" odds="3.35" active="1"></outcome>
      |            <outcome id="63" odds="3.35" active="1"></outcome>
      |        </market>
      |        <market id="42" specifiers="order=2|map=3" status="1">
      |            <outcome id="66" odds="3.35" active="1"></outcome>
      |            <outcome id="65" odds="3.35" active="1"></outcome>
      |            <outcome id="64" odds="3.35" active="1"></outcome>
      |            <outcome id="63" odds="3.35" active="1"></outcome>
      |        </market>
      |        <market id="30" specifiers="map=1" status="1">
      |            <outcome id="7" odds="1" active="0"></outcome>
      |            <outcome id="6" odds="12.7" active="1"></outcome>
      |        </market>
      |        <market id="18" specifiers="map=3" status="1">
      |            <outcome id="2" odds="2.05" active="1"></outcome>
      |            <outcome id="1" odds="1.68" active="1"></outcome>
      |        </market>
      |        <market id="17" specifiers="map=2" status="1">
      |            <outcome id="2" odds="1.94" active="1"></outcome>
      |            <outcome id="1" odds="1.76" active="1"></outcome>
      |        </market>
      |    </odds>
      |</odds_change>
      |""".stripMargin
}
