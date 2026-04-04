package tech.argyll.gmx.predictorgame.engine.racing

import java.sql.Timestamp
import java.time.ZonedDateTime

import org.junit.runner.RunWith
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.prop.TableDrivenPropertyChecks
import tech.argyll.gmx.predictorgame.Tables.EventsRow
import tech.argyll.gmx.predictorgame.domain.model.EventStatus
import tech.argyll.gmx.predictorgame.domain.model.EventStatus.EventStatus
import tech.argyll.gmx.predictorgame.domain.model.racing.HorseStatus

@RunWith(classOf[JUnitRunner])
class RacingResultOpsTest extends FlatSpec with TableDrivenPropertyChecks with DomainMapper {

  private val objectUnderTest = new RacingResultOps {}

  private val IRRELEVANT = "Does not matter"
  private val raceResultCalculator =
    Table(
      ("dbEvent", "updateEvent", "updateParticipant1", "updateParticipant2", "expectedStatus", "expectedWinner"),

      (dbEvent(2275082, 2326435),
        HorseRacingEventUpdate(873208, IRRELEVANT, ZonedDateTime.now(), mapEventStatus("Off")),
        HorseRacingParticipantUpdate(873208, 2275082, mapHorseStatus("Runner"), None),
        HorseRacingParticipantUpdate(873208, 2326435, mapHorseStatus("Runner"), None),
        EventStatus.ONGOING,
        None
      ),
      (dbEvent(1732323, 2134971),
        HorseRacingEventUpdate(873209, IRRELEVANT, ZonedDateTime.now(), mapEventStatus("WeighedIn")),
        HorseRacingParticipantUpdate(873209, 1732323, mapHorseStatus("NonRunner"), None),
        HorseRacingParticipantUpdate(873209, 2134971, mapHorseStatus("Runner"), Some(6)),
        EventStatus.VOID,
        None
      ),
      (dbEvent(2263564, 2246532),
        HorseRacingEventUpdate(873210, IRRELEVANT, ZonedDateTime.now(), mapEventStatus("Result")),
        HorseRacingParticipantUpdate(873210, 2263564, mapHorseStatus("Runner"), Some(4)),
        HorseRacingParticipantUpdate(873210, 2246532, mapHorseStatus("Runner"), Some(6)),
        EventStatus.ONGOING,
        None
      ),
      (dbEvent(2312373, 2244918),
        HorseRacingEventUpdate(873211, IRRELEVANT, ZonedDateTime.now(), mapEventStatus("Finished")),
        HorseRacingParticipantUpdate(873211, 2312373, HorseStatus.CASUALTY, None),
        HorseRacingParticipantUpdate(873211, 2244918, HorseStatus.CASUALTY, None),
        EventStatus.VOID,
        None
      ),
      (dbEvent(2347565, 2263566),
        HorseRacingEventUpdate(873212, IRRELEVANT, ZonedDateTime.now(), mapEventStatus("WeighedIn")),
        HorseRacingParticipantUpdate(873212, 2347565, HorseStatus.CASUALTY, None),
        HorseRacingParticipantUpdate(873212, 2263566, mapHorseStatus("Runner"), Some(4)),
        EventStatus.FINISHED,
        Some("selectionB")
      ),
      (dbEvent(2270663, 2272412),
        HorseRacingEventUpdate(873213, IRRELEVANT, ZonedDateTime.now(), mapEventStatus("Abandoned")),
        HorseRacingParticipantUpdate(873213, 2270663, mapHorseStatus("Runner"), Some(1)),
        HorseRacingParticipantUpdate(873213, 2272412, mapHorseStatus("Runner"), Some(5)),
        EventStatus.VOID,
        None
      ),
      (dbEvent(2376086, 2446047),
        HorseRacingEventUpdate(873214, IRRELEVANT, ZonedDateTime.now(), mapEventStatus("Photograph")),
        HorseRacingParticipantUpdate(873214, 2376086, mapHorseStatus("Runner"), Some(2)),
        HorseRacingParticipantUpdate(873214, 2446047, mapHorseStatus("Runner"), Some(2)),
        EventStatus.ONGOING,
        None
      ),
      (dbEvent(2312022, 2265213),
        HorseRacingEventUpdate(931164, IRRELEVANT, ZonedDateTime.now(), EventStatus.FINISHED),
        HorseRacingParticipantUpdate(931164, 2312022, HorseStatus.CASUALTY, None),
        HorseRacingParticipantUpdate(931164, 2265213, HorseStatus.RUNNER, Some(1)),
        EventStatus.FINISHED,
        Some("selectionB")
      ),

    )

  it should "'recalculateEvent()' according to business rules" in {
    forAll(raceResultCalculator) { (dbEvent: EventsRow,
                                    updateEvent: HorseRacingEventUpdate,
                                    updateParticipant1: HorseRacingParticipantUpdate,
                                    updateParticipant2: HorseRacingParticipantUpdate,
                                    expectedStatus: EventStatus,
                                    expectedWinner: Option[String]) =>

      // when
      val afterUpdate1 = objectUnderTest.recalculateEvent(dbEvent, updateEvent)
      val afterUpdate2 = objectUnderTest.recalculateEvent(afterUpdate1, updateParticipant1)
      val afterUpdate3 = objectUnderTest.recalculateEvent(afterUpdate2, updateParticipant2)

      // then
      afterUpdate3.status should be(expectedStatus.toString)
      afterUpdate3.winner should be(expectedWinner)
    }
  }

  private def dbEvent(selectionA: Long, selectionB: Long) =
    EventsRow("dbId", new Timestamp(1), "NEW", None, "roundId",
      "selectionA", Some(s"""{ "horseId": $selectionA, "lineId": "$IRRELEVANT", "horseName": "$IRRELEVANT", "jockeyName": "$IRRELEVANT", "trainerName": "$IRRELEVANT", "jockeySilk": "$IRRELEVANT", "price": "$IRRELEVANT" }"""),
      "selectionB", Some(s"""{ "horseId": $selectionB, "lineId": "$IRRELEVANT", "horseName": "$IRRELEVANT", "jockeyName": "$IRRELEVANT", "trainerName": "$IRRELEVANT", "jockeySilk": "$IRRELEVANT", "price": "$IRRELEVANT" }"""),
      None)

}
