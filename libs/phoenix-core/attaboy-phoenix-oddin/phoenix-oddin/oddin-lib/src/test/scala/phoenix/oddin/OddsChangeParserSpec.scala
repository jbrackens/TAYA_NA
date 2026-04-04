package phoenix.oddin

import java.util.UUID

import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

class OddsChangeParserSpec extends AnyWordSpecLike with Matchers {
  import OddsChangeParserSpec._

  private def createCorrelationId(): String = UUID.randomUUID().toString

  "OddsChangeParser" must {

    "convert from an xml string with all fields" in {
      val result = OddinXmlParsing.parseOddsChange(createCorrelationId(), allFields)
    }

    "convert from an xml string with no odds present" in {
      val result = OddinXmlParsing.parseOddsChange(createCorrelationId(), noOdds)
    }

    "convert from an xml string with sport event status present" in {
      val result = OddinXmlParsing.parseOddsChange(createCorrelationId(), noSportEventStatus)
    }

    "convert from an xml string when odds missing from some markets" in {
      val result = OddinXmlParsing.parseOddsChange(createCorrelationId(), missingOddsInSomeMarkets)
    }

    "parse a single market specifier" in {
      val specifiersStr = "map=1"
      val result = OddinXmlParsing.parseMarketSpecifiers(specifiersStr)

      result must be(Map("map" -> "1"))
    }

    "parse a pipe-delimited list of market specifiers" in {
      val specifiersStr = "map=3|threshold=9"
      val result = OddinXmlParsing.parseMarketSpecifiers(specifiersStr)

      result must be(Map("map" -> "3", "threshold" -> "9"))
    }
  }
}

object OddsChangeParserSpec {

  val allFields = """
    |<odds_change timestamp="1604492488239" event_id="od:match:18036" product="2">
    |    <sport_event_status home_score="0" away_score="0" status="1" scoreboard_available="true" match_status="51">
    |        <period_scores>
    |            <period_score type="map" number="1" match_status_code="51" home_score="0" away_score="0"></period_score>
    |            <period_score type="map" number="2" match_status_code="52" home_score="0" away_score="0"></period_score>
    |            <period_score type="map" number="3" match_status_code="53" home_score="0" away_score="0"></period_score>
    |        </period_scores>
    |        <scoreboard current_ct_team="1" home_won_rounds="9" away_won_rounds="6" current_round="17"></scoreboard>
    |    </sport_event_status>
    |    <odds>
    |        <market id="37" specifiers="side=home" status="1">
    |            <outcome id="7" odds="9.4" active="1"></outcome>
    |            <outcome id="6" odds="1.02" active="1"></outcome>
    |        </market>
    |        <market id="7" specifiers="map=1|round=20" status="1">
    |            <outcome id="2" odds="2.18" active="1"></outcome>
    |            <outcome id="1" odds="1.6" active="1"></outcome>
    |        </market>
    |        <market id="2" specifiers="handicap=1.5" status="1">
    |            <outcome id="2" odds="2" active="1"></outcome>
    |            <outcome id="1" odds="1.73" active="1"></outcome>
    |        </market>
    |        <market id="6" specifiers="variant=way:two|map=2|way=two" status="1">
    |            <outcome id="2" odds="2.32" active="1"></outcome>
    |            <outcome id="1" odds="1.57" active="1"></outcome>
    |        </market>
    |        <market id="3" specifiers="threshold=2.5" status="1">
    |            <outcome id="5" odds="2.18" active="1"></outcome>
    |            <outcome id="4" odds="1.62" active="1"></outcome>
    |        </market>
    |        <market id="6" specifiers="variant=way:two|map=1|way=two" status="1">
    |            <outcome id="2" odds="6.9" active="1"></outcome>
    |            <outcome id="1" odds="1.07" active="1"></outcome>
    |        </market>
    |        <market id="2" specifiers="handicap=-1.5" status="1">
    |            <outcome id="2" odds="9.4" active="1"></outcome>
    |            <outcome id="1" odds="1.02" active="1"></outcome>
    |        </market>
    |        <market id="6" specifiers="variant=way:three|map=1|way=three" status="1">
    |            <outcome id="3" odds="7.5" active="1"></outcome>
    |            <outcome id="2" odds="6.9" active="1"></outcome>
    |            <outcome id="1" odds="1.15" active="1"></outcome>
    |        </market>
    |        <market id="4" specifiers="variant=best_of:3|best_of=3" status="1">
    |            <outcome id="12" odds="3.35" active="1"></outcome>
    |            <outcome id="11" odds="4.9" active="1"></outcome>
    |            <outcome id="10" odds="1.73" active="1"></outcome>
    |            <outcome id="8" odds="9.4" active="1"></outcome>
    |        </market>
    |        <market id="7" specifiers="map=1|round=19" status="-1">
    |            <outcome id="2" active="0"></outcome>
    |            <outcome id="1" active="0"></outcome>
    |        </market>
    |        <market id="37" specifiers="side=away" status="1">
    |            <outcome id="7" odds="1.73" active="1"></outcome>
    |            <outcome id="6" odds="2" active="1"></outcome>
    |        </market>
    |        <market id="1" specifiers="variant=way:two|way=two" status="1">
    |            <outcome id="2" odds="4.16" active="1"></outcome>
    |            <outcome id="1" odds="1.21" active="1"></outcome>
    |        </market>
    |    </odds>
    |</odds_change>
    |""".stripMargin

  val noOdds =
    """
      |<odds_change timestamp="1604492487209" event_id="od:match:19383" product="2">
      |    <sport_event_status home_score="1" away_score="1" status="1" scoreboard_available="true" match_status="53">
      |        <period_scores>
      |            <period_score type="map" number="1" match_status_code="51" home_score="0" away_score="1" home_kills="17" away_kills="24"></period_score>
      |            <period_score type="map" number="2" match_status_code="52" home_score="1" away_score="0" home_kills="39" away_kills="9"></period_score>
      |            <period_score type="map" number="3" match_status_code="53" home_score="0" away_score="0"></period_score>
      |        </period_scores>
      |        <scoreboard home_kills="25" away_kills="10" home_destroyed_towers="6" away_destroyed_towers="3" home_gold="21" away_gold="18"></scoreboard>
      |    </sport_event_status>
      |    <odds></odds>
      |</odds_change>
      |""".stripMargin

  val noSportEventStatus =
    """
      |<odds_change timestamp="1604492473283" event_id="od:match:19383" product="2">
      |    <odds>
      |        <market id="1" specifiers="variant=way:two|way=two" status="1">
      |            <outcome id="2" odds="11.5" active="1"></outcome>
      |            <outcome id="1" odds="1" active="1"></outcome>
      |        </market>
      |        <market id="6" specifiers="variant=way:two|way=two|map=3" status="1">
      |            <outcome id="2" odds="11.5" active="1"></outcome>
      |            <outcome id="1" odds="1" active="1"></outcome>
      |        </market>
      |        <market id="4" specifiers="variant=best_of:3|best_of=3" status="1">
      |            <outcome id="12" odds="1" active="1"></outcome>
      |            <outcome id="11" odds="11.5" active="1"></outcome>
      |            <outcome id="10" active="0"></outcome>
      |            <outcome id="8" active="0"></outcome>
      |        </market>
      |    </odds>
      |</odds_change>
      |""".stripMargin

  val missingOddsInSomeMarkets =
    """
      |<odds_change timestamp="1604492473283" event_id="od:match:19383" product="2">
      |    <odds>
      |        <market id="1" specifiers="variant=way:two|way=two" status="1">
      |            <outcome id="2" odds="11.5" active="1"></outcome>
      |            <outcome id="1" odds="1" active="1"></outcome>
      |        </market>
      |        <market id="6" specifiers="variant=way:two|way=two|map=3" status="1">
      |            <outcome id="2" odds="11.5" active="1"></outcome>
      |            <outcome id="1" odds="1" active="1"></outcome>
      |        </market>
      |        <market id="4" specifiers="variant=best_of:3|best_of=3" status="1">
      |            <outcome id="12" odds="1" active="1"></outcome>
      |            <outcome id="11" odds="11.5" active="1"></outcome>
      |            <outcome id="10" active="0"></outcome>
      |            <outcome id="8" active="0"></outcome>
      |        </market>
      |    </odds>
      |</odds_change>
      |""".stripMargin
}
