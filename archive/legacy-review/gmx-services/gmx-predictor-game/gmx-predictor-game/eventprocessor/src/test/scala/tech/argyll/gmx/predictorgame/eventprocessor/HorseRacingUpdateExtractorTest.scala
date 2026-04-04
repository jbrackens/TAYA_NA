package tech.argyll.gmx.predictorgame.eventprocessor

import java.time.{LocalDateTime, ZoneOffset}

import org.junit.runner.RunWith
import org.scalatest.FunSuite
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import tech.argyll.gmx.predictorgame.common.FileUtils
import tech.argyll.gmx.predictorgame.domain.model.EventStatus.NEW
import tech.argyll.gmx.predictorgame.domain.model.racing.HorseStatus
import tech.argyll.gmx.predictorgame.eventprocessor.parser.BettingParser

import scala.collection.JavaConverters._

@RunWith(classOf[JUnitRunner])
class HorseRacingUpdateExtractorTest extends FunSuite {

  private val objectUnderTest = new HorseRacingUpdateExtractor

  private val bettingParser = new BettingParser

  test("'prepareEventUpdate()' should extract data") {
    // given
    val xmlToParse = FileUtils.readToInputStream("xml/horseRacingSample.xml")
    val meetings = bettingParser.parse(xmlToParse)
    val givenMeeting = meetings.get(0)
    val givenRace = givenMeeting.getRace.get(0)

    //when
    val actual = objectUnderTest.prepareEventUpdate(givenMeeting, givenRace)

    //then
    actual.raceId should be(870258)
    actual.location should be("Leicester")
    actual.status should be(NEW)
    actual.startTime should be(LocalDateTime.of(2019, 2, 14, 14, 15, 0).atZone(ZoneOffset.UTC))
  }

  test("'prepareParticipantUpdate()' should extract data") {
    // given
    val xmlToParse = FileUtils.readToInputStream("xml/horseRacingSample.xml")
    val meetings = bettingParser.parse(xmlToParse)
    val givenMeeting = meetings.get(0)
    val givenRace = givenMeeting.getRace.get(0)

    //when
    val actual = givenRace.getHorse.asScala.map(objectUnderTest.prepareParticipantUpdate(givenRace, _))

    //then
    actual(0).raceId should be(870258)
    actual(0).horseId should be(2324026)
    actual(0).finishPosition should be(None)
    actual(0).status should be(HorseStatus.CASUALTY)

    actual(1).raceId should be(870258)
    actual(1).horseId should be(2319846)
    actual(1).finishPosition should be(None)
    actual(1).status should be(HorseStatus.NON_RUNNER)

    actual(2).raceId should be(870258)
    actual(2).horseId should be(2298627)
    actual(2).finishPosition should be(Some(4))
    actual(2).status should be(HorseStatus.RUNNER)

    actual(3).raceId should be(870258)
    actual(3).horseId should be(2325819)
    actual(3).finishPosition should be(None)
    actual(3).status should be(HorseStatus.NON_RUNNER)
  }

}
