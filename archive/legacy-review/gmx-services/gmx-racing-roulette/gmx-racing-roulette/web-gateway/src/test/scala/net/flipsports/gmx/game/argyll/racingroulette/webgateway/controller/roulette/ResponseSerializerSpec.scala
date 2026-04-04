package net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller.roulette

import java.time.{LocalDateTime, ZoneOffset}

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.EventStatus.RaceOff
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.SuccessMetadata
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Operation.{CalculateReturn, PlaceBets, SubscribeEvent}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.SelectionStatus.{Active, Disabled, NonRunner}
import org.junit.runner.RunWith
import org.scalatest.concurrent.Futures
import org.scalatest.junit.JUnitRunner
import org.scalatest.{FunSuite, MustMatchers}
import play.api.libs.json.Json

@RunWith(classOf[JUnitRunner])
class ResponseSerializerSpec extends FunSuite with Futures with MustMatchers {

  private val objectUnderTest = new ResponseSerializer

  test("'toJson()' SHOULD write JSON WHEN EventStateResp") {
    // given
    val givenElement = EventStateResp(
      SuccessMetadata(Some("c9266c4d-a332-472b-8c6c-c41b66a2033d"), SubscribeEvent, "GOOG", 12342134L),
      "Newcastle",
      LocalDateTime.of(2019, 9, 5, 15, 45).atZone(ZoneOffset.of("+02:00")),
      RaceOff,
      Seq(
        Participant("id1", 1, "1/20", 19.0, Active),
        Participant("id2", 2, "2/7", 10.0, Disabled),
        Participant("id3", 3, "7/9", 3.5, NonRunner)
      ))

    // when
    val actual = objectUnderTest.toJson(givenElement)

    // then
    actual mustEqual Json.parse(
      """
{
  "meta": {
    "requestId": "c9266c4d-a332-472b-8c6c-c41b66a2033d",
    "operation": "SubscribeEvent",
    "eventId": "GOOG",
    "lastUpdated": 12342134,
    "result":"SUCCESS"
  },
  "location": "Newcastle",
  "startTime": "2019-09-05T15:45+02:00",
  "status": "RaceOff",
  "participants": [
    {
      "id": "id1",
      "position": 1,
      "displayOdds": "1/20",
      "trueOdds": 19.0,
      "status": "Active"
    },
    {
      "id": "id2",
      "position": 2,
      "displayOdds": "2/7",
      "trueOdds": 10.0,
      "status": "Disabled"
    },
    {
      "id": "id3",
      "position": 3,
      "displayOdds": "7/9",
      "trueOdds": 3.5,
      "status": "NonRunner"
    }
  ]
}
    """)
  }

  test("'toJson()' SHOULD write JSON WHEN CalculateReturnResp") {
    // given
    val givenElement = CalculateReturnResp(
      SuccessMetadata(Some("e27b7e86-6956-4595-b6c2-3170d9aef82b"), CalculateReturn, "123", 6778),
      Seq(
        CalculatedReturn("BLACK", 10, 34.5, Seq(1, 3, 5, 7), true),
        CalculatedReturn("1-10", 5, 0, Seq(), false),
        CalculatedReturn("12", 0.5, 0.56, Seq(12), true),
        CalculatedReturn("R2", 4, 5.90, Seq(1, 2, 3, 4, 5), true)
      ))

    // when
    val actual = objectUnderTest.toJson(givenElement)

    // then
    actual mustEqual Json.parse(
      """
{
  "meta": {
    "requestId": "e27b7e86-6956-4595-b6c2-3170d9aef82b",
    "operation": "CalculateReturn",
    "eventId": "123",
    "lastUpdated": 6778,
    "result":"SUCCESS"
  },
  "returns": [
    {
      "display": "BLACK",
      "potentialReturn": 34.5,
      "totalStake": 10.0,
      "includedSelections": [1, 3, 5, 7],
      "valid": true
    },
    {
      "display": "1-10",
      "potentialReturn": 0.0,
      "totalStake": 5.0,
      "includedSelections": [],
      "valid": false
    },
    {
      "display": "12",
      "potentialReturn": 0.56,
      "totalStake": 0.5,
      "includedSelections": [12],
      "valid": true
    },
    {
      "display": "R2",
      "potentialReturn": 5.90,
      "totalStake": 4.0,
      "includedSelections": [1, 2, 3, 4, 5],
      "valid": true
    }
  ]
}
    """)
  }

  test("'toJson()' SHOULD write JSON WHEN PlaceBetsResp") {
    // given
    val givenElement = PlaceBetsResp(
      SuccessMetadata(Some("383d7230-98f7-4d14-bd34-b5b70d2c6aa9"), PlaceBets, "race2", 11111),
      "Some text")

    // when
    val actual = objectUnderTest.toJson(givenElement)

    // then
    actual mustEqual Json.parse(
      """
{
  "meta": {
    "requestId": "383d7230-98f7-4d14-bd34-b5b70d2c6aa9",
    "operation": "PlaceBets",
    "eventId": "race2",
    "lastUpdated": 11111,
    "result":"SUCCESS"
  },
  "result": "Some text"
}
    """)
  }
}
