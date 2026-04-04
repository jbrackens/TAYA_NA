package tech.argyll.gmx.predictorgame.services.prediction

import java.sql.Timestamp
import java.time.Month.SEPTEMBER
import java.time._

import org.junit.runner.RunWith
import org.scalatest.FunSuite
import org.scalatest.junit.JUnitRunner
import tech.argyll.gmx.predictorgame.Tables.{EventPredictionsRow, EventsRow}
import tech.argyll.gmx.predictorgame.domain.model.team.TeamCompetitionSelectionDetails
import tech.argyll.gmx.predictorgame.domain.model.team.TeamCompetitionSelectionDetails.writeString

@RunWith(classOf[JUnitRunner])
class PredictionValidationsSingleTest extends FunSuite {

  private val objectUnderTest = new PredictionValidations {}

  test("'validateUpdated()' should FAIL when (selection not available in event)") {
    // given

    val dbTime = sampleDbTime
    val appTime = beforeAppTime(dbTime)

    val givenPredictions = SelectedPrediction("1", 12, Some("s1"))
    val givenEvent = differentSelectionEvent(dbTime, givenPredictions)
    val givenStored = correspondingStored(givenPredictions, givenEvent)

    // when
    intercept[IllegalArgumentException] {
      objectUnderTest.validateUpdated(givenPredictions, givenEvent, givenStored, Timestamp.from(appTime.toInstant))
    }

    // then
  }

  test("'validateUpdated()' should FAIL when (event started) and (points changed)") {
    // given
    val dbTime = sampleDbTime
    val appTime = correspondingAppTime(dbTime)

    val givenPredictions = SelectedPrediction("1", 12, Some("s1"))
    val givenEvent = correspondingEvent(givenPredictions, dbTime)
    val givenStored = correspondingStored(givenPredictions, givenEvent).copy(points = 1)

    // when
    intercept[IllegalArgumentException] {
      objectUnderTest.validateUpdated(givenPredictions, givenEvent, givenStored, Timestamp.from(appTime.toInstant))
    }
    intercept[IllegalArgumentException] {
      objectUnderTest.validateUpdated(givenPredictions, givenEvent, givenStored.copy(locked = true), Timestamp.from(appTime.minusMinutes(30).toInstant))
    }

    // then
  }

  test("'validateUpdated()' should FAIL when (event started) and (selection changed)") {
    // given
    val dbTime = sampleDbTime
    val appTime = correspondingAppTime(dbTime)

    val givenPredictions = SelectedPrediction("1", 12, Some("s1"))
    val givenEvent = correspondingEvent(givenPredictions, dbTime)
    val givenStored = correspondingStored(givenPredictions, givenEvent).copy(selection = Some("prevValue"))

    // when
    intercept[IllegalArgumentException] {
      objectUnderTest.validateUpdated(givenPredictions, givenEvent, givenStored, Timestamp.from(appTime.toInstant))
    }
    intercept[IllegalArgumentException] {
      objectUnderTest.validateUpdated(givenPredictions, givenEvent, givenStored.copy(locked = true), Timestamp.from(appTime.minusMinutes(30).toInstant))
    }

    // then
  }

  test("'validateUpdated()' should FAIL when (event upcoming) and (selection empty)") {
    // given
    val dbTime = sampleDbTime
    val appTime = beforeAppTime(dbTime)

    val givenPredictions = SelectedPrediction("1", 12, None)
    val givenEvent = correspondingEvent(givenPredictions, dbTime)
    val givenStored = correspondingStored(givenPredictions, givenEvent)

    // when
    intercept[IllegalArgumentException] {
      objectUnderTest.validateUpdated(givenPredictions, givenEvent, givenStored, Timestamp.from(appTime.toInstant))
    }

    // then
  }

  test("'validateUpdated()' should PASS when (event started) and (selection not changed) and (points not changed)") {
    // given
    val dbTime = sampleDbTime
    val appTime = correspondingAppTime(dbTime)

    val givenPredictions = SelectedPrediction("1", 12, Some("s1"))
    val givenEvent = correspondingEvent(givenPredictions, dbTime)
    val givenStored = correspondingStored(givenPredictions, givenEvent)

    // when
    objectUnderTest.validateUpdated(givenPredictions, givenEvent, givenStored, Timestamp.from(appTime.toInstant))

    objectUnderTest.validateUpdated(givenPredictions, givenEvent, givenStored.copy(locked = true), Timestamp.from(appTime.minusMinutes(30).toInstant))

    // then
  }

  test("'validateUpdated()' should PASS when (event upcoming) and (selection provided)") {
    // given
    val dbTime = sampleDbTime
    val appTime = beforeAppTime(dbTime)

    val givenPredictions = SelectedPrediction("1", 12, Some("s1"))
    val givenEvent = correspondingEvent(givenPredictions, dbTime)
    val givenStored = correspondingStored(givenPredictions, givenEvent).copy(selection = Some("prevValue"), points = 1)


    // when
    objectUnderTest.validateUpdated(givenPredictions, givenEvent, givenStored, Timestamp.from(appTime.toInstant))

    // then
  }

  test("'validateNew()' should FAIL when (selection not available in event)") {
    // given
    val dbTime = sampleDbTime
    val appTime = beforeAppTime(dbTime)

    val givenPredictions = SelectedPrediction("1", 12, Some("s1"))
    val givenEvent = differentSelectionEvent(dbTime, givenPredictions)

    // when
    intercept[IllegalArgumentException] {
      objectUnderTest.validateNew(givenPredictions, givenEvent, Timestamp.from(appTime.toInstant))
    }

    // then
  }

  test("'validateNew()' should FAIL when (event started) and (selection provided)") {
    // given
    val dbTime = sampleDbTime
    val appTime = correspondingAppTime(dbTime)

    val givenPredictions = SelectedPrediction("1", 12, Some("s1"))
    val givenEvent = correspondingEvent(givenPredictions, dbTime)

    // when
    intercept[IllegalArgumentException] {
      objectUnderTest.validateNew(givenPredictions, givenEvent, Timestamp.from(appTime.toInstant))
    }

    // then
  }

  test("'validateNew()' should FAIL when (event upcoming) and (selection empty)") {
    // given
    val dbTime = sampleDbTime
    val appTime = beforeAppTime(dbTime)

    val givenPredictions = SelectedPrediction("1", 12, None)
    val givenEvent = correspondingEvent(givenPredictions, dbTime)

    // when
    intercept[IllegalArgumentException] {
      objectUnderTest.validateNew(givenPredictions, givenEvent, Timestamp.from(appTime.toInstant))
    }

    // then
  }

  test("'validateNew()' should PASS when (event started) and (selection empty)") {
    // given
    val dbTime = sampleDbTime
    val appTime = correspondingAppTime(dbTime)

    val givenPredictions = SelectedPrediction("1", 12, None)
    val givenEvent = correspondingEvent(givenPredictions, dbTime)

    // when
    objectUnderTest.validateNew(givenPredictions, givenEvent, Timestamp.from(appTime.toInstant))

    // then

  }

  test("'validateNew()' should PASS when (event upcoming) and (selection provided)") {
    // given
    val dbTime = sampleDbTime
    val appTime = beforeAppTime(dbTime)

    val givenPredictions = SelectedPrediction("1", 12, Some("s1"))
    val givenEvent = correspondingEvent(givenPredictions, dbTime)

    // when
    objectUnderTest.validateNew(givenPredictions, givenEvent, Timestamp.from(appTime.toInstant))

    // then
  }

  private def sampleDbTime = {
    LocalDateTime
      .of(2018, SEPTEMBER, 10, 10, 20, 30)
      .atZone(ZoneId.of("UTC"))
  }

  private def correspondingAppTime(dbTime: ZonedDateTime) = {
    dbTime.withZoneSameInstant(ZoneId.of("UTC+1"))
  }

  private def beforeAppTime(dbTime: ZonedDateTime) = {
    correspondingAppTime(dbTime).minusMinutes(30)
  }

  private def correspondingEvent(prediction: SelectedPrediction, dbTime: ZonedDateTime) = {
    EventsRow(prediction.id, Timestamp.from(dbTime.toInstant), "NEW", None, "",
      prediction.selection.getOrElse("some"), Some(writeString(new TeamCompetitionSelectionDetails("not_used", None))),
      "other", Some(writeString(new TeamCompetitionSelectionDetails("not_used", None))))
  }

  private def differentSelectionEvent(dbTime: ZonedDateTime, givenPredictions: SelectedPrediction) = {
    correspondingEvent(givenPredictions, dbTime).copy(selectionAId = "other")
  }

  private def correspondingStored(prediction: SelectedPrediction, event: EventsRow) = {
    EventPredictionsRow("not_used", "not_used", event.id, prediction.selection, prediction.points)
  }
}
