package net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller.roulette

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Operation.{CalculateReturn, EventUpdate, PlaceBets, SubscribeEvent}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request.{CalculateReturnReq, EventUpdateReq, PlaceBetsReq, SubscribeEventReq}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.SelectionStatus.{Active, Disabled, NonRunner}
import org.junit.runner.RunWith
import org.scalatest.concurrent.Futures
import org.scalatest.junit.JUnitRunner
import org.scalatest.{FunSuite, Matchers}
import play.api.libs.json.{JsResult, JsResultException, Json}

@RunWith(classOf[JUnitRunner])
class RequestDeserializerSpec extends FunSuite with Futures with Matchers {

  private val objectUnderTest = new RequestDeserializer

  test("'toJson()' SHOULD read JSON WHEN SubscribeEventReq") {
    // given
    val givenElement = Json.parse(
      """
{
  "meta": {
    "requestId": "9ccb02ec-3e42-4028-855d-d3cd127ee2cf",
    "operation": "SubscribeEvent",
    "eventId": "GOOG"
  }
}
    """)

    // when
    val actual = objectUnderTest.fromJson(givenElement).asInstanceOf[JsResult[SubscribeEventReq]].get

    // then
    actual.meta.requestId should be(Some("9ccb02ec-3e42-4028-855d-d3cd127ee2cf"))
    actual.meta.operation should be(SubscribeEvent)
    actual.meta.eventId should be("GOOG")
  }

  test("'fromJson()' SHOULD read JSON WHEN EventUpdateReq") {
    // given
    val givenElement = Json.parse(
      """
{
  "meta": {
    "requestId": "17c1af98-4046-40f5-9859-5232f6e84c28",
    "operation": "EventUpdate",
    "eventId": "12345"
  }
}
    """)

    // when
    val actual = objectUnderTest.fromJson(givenElement).asInstanceOf[JsResult[EventUpdateReq]].get

    // then
    actual.meta.requestId should be(Some("17c1af98-4046-40f5-9859-5232f6e84c28"))
    actual.meta.operation should be(EventUpdate)
    actual.meta.eventId should be("12345")
  }

  test("'toJson()' SHOULD read JSON WHEN CalculateReturnReq") {
    // given
    val givenElement = Json.parse(
      """
{
  "meta": {
    "requestId": "b1c8a117-23e9-47ce-8b1d-e244ead76ee5",
    "operation": "CalculateReturn",
    "eventId": "xxx"
  },
  "placedChips": [
    {
      "display": "BLACK",
      "totalStake": 5,
      "selectedParticipants": [
        {
          "id": "id1",
          "position": 1,
          "displayOdds": "4/1",
          "trueOdds": 19.0,
          "status": "Active"
        },
        {
          "id": "id3",
          "position": 3,
          "displayOdds": "1/4",
          "trueOdds": 9.0,
          "status": "NonRunner"
        }
      ]
    },
    {
      "display": "4",
      "totalStake": 2,
      "selectedParticipants": [
        {
          "id": "id4",
          "position": 4,
          "displayOdds": "10/1",
          "trueOdds": 5.5,
          "status": "Disabled"
        }
      ]
    }
  ]
}
    """)

    // when
    val actual = objectUnderTest.fromJson(givenElement).asInstanceOf[JsResult[CalculateReturnReq]].get

    // then
    actual.meta.requestId should be(Some("b1c8a117-23e9-47ce-8b1d-e244ead76ee5"))
    actual.meta.operation should be(CalculateReturn)
    actual.meta.eventId should be("xxx")
    actual.placedChips should have size (2)
    actual.placedChips(0).display should be("BLACK")
    actual.placedChips(0).totalStake should be(5)
    actual.placedChips(0).selectedParticipants should have size (2)
    actual.placedChips(0).selectedParticipants(0).id should be("id1")
    actual.placedChips(0).selectedParticipants(0).position should be(1)
    actual.placedChips(0).selectedParticipants(0).displayOdds should be("4/1")
    actual.placedChips(0).selectedParticipants(0).trueOdds should be(19.0)
    actual.placedChips(0).selectedParticipants(0).status should be(Active)
    actual.placedChips(0).selectedParticipants(1).id should be("id3")
    actual.placedChips(0).selectedParticipants(1).position should be(3)
    actual.placedChips(0).selectedParticipants(1).displayOdds should be("1/4")
    actual.placedChips(0).selectedParticipants(1).trueOdds should be(9.0)
    actual.placedChips(0).selectedParticipants(1).status should be(NonRunner)
    actual.placedChips(1).display should be("4")
    actual.placedChips(1).totalStake should be(2)
    actual.placedChips(1).selectedParticipants should have size (1)
    actual.placedChips(1).selectedParticipants(0).id should be("id4")
    actual.placedChips(1).selectedParticipants(0).position should be(4)
    actual.placedChips(1).selectedParticipants(0).displayOdds should be("10/1")
    actual.placedChips(1).selectedParticipants(0).trueOdds should be(5.5)
    actual.placedChips(1).selectedParticipants(0).status should be(Disabled)
  }

  test("'toJson()' SHOULD read JSON WHEN PlaceBetsReq") {
    // given
    val givenElement = Json.parse(
      """
{
  "meta": {
    "requestId": "095c2986-65a1-47db-b603-31346073debe",
    "operation": "PlaceBets",
    "eventId": "qwerty"
  },
  "userJWT": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "placedChips": [
    {
      "display": "1-2",
      "totalStake": 4,
      "selectedParticipants": [
        {
          "id": "id1",
          "position": 1,
          "displayOdds": "5/2",
          "trueOdds": 5.2,
          "status": "Active"
        },
        {
          "id": "id2",
          "position": 2,
          "displayOdds": "11/4",
          "trueOdds": 11.4,
          "status": "Active"
        }
      ]
    },
    {
      "display": "R2",
      "totalStake": 2,
      "selectedParticipants": [
        {
          "id": "id2",
          "position": 2,
          "displayOdds": "11/4",
          "trueOdds": 5.0,
          "status": "Active"
        },
        {
          "id": "id4",
          "position": 4,
          "displayOdds": "5/6",
          "trueOdds": 26.0,
          "status": "Active"
        }
      ]
    },
    {
      "display": "1",
      "totalStake": 1,
      "selectedParticipants": [
        {
          "id": "id1",
          "position": 1,
          "displayOdds": "5/2",
          "trueOdds": 1.0,
          "status": "Active"
        }
      ]
    }
  ]
}
    """)

    // when
    val actual = objectUnderTest.fromJson(givenElement).asInstanceOf[JsResult[PlaceBetsReq]].get

    // then
    actual.meta.requestId should be(Some("095c2986-65a1-47db-b603-31346073debe"))
    actual.meta.operation should be(PlaceBets)
    actual.meta.eventId should be("qwerty")
    actual.userJWT should be("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c")
    actual.placedChips should have size (3)
    actual.placedChips(0).display should be("1-2")
    actual.placedChips(0).totalStake should be(4)
    actual.placedChips(0).selectedParticipants should have size (2)
    actual.placedChips(0).selectedParticipants(0).id should be("id1")
    actual.placedChips(0).selectedParticipants(0).position should be(1)
    actual.placedChips(0).selectedParticipants(0).displayOdds should be("5/2")
    actual.placedChips(0).selectedParticipants(0).trueOdds should be(5.2)
    actual.placedChips(0).selectedParticipants(0).status should be(Active)
    actual.placedChips(0).selectedParticipants(1).id should be("id2")
    actual.placedChips(0).selectedParticipants(1).position should be(2)
    actual.placedChips(0).selectedParticipants(1).displayOdds should be("11/4")
    actual.placedChips(0).selectedParticipants(1).trueOdds should be(11.4)
    actual.placedChips(0).selectedParticipants(1).status should be(Active)
    actual.placedChips(1).display should be("R2")
    actual.placedChips(1).totalStake should be(2)
    actual.placedChips(1).selectedParticipants should have size (2)
    actual.placedChips(1).selectedParticipants(0).id should be("id2")
    actual.placedChips(1).selectedParticipants(0).position should be(2)
    actual.placedChips(1).selectedParticipants(0).displayOdds should be("11/4")
    actual.placedChips(1).selectedParticipants(0).trueOdds should be(5.0)
    actual.placedChips(1).selectedParticipants(0).status should be(Active)
    actual.placedChips(1).selectedParticipants(1).id should be("id4")
    actual.placedChips(1).selectedParticipants(1).position should be(4)
    actual.placedChips(1).selectedParticipants(1).displayOdds should be("5/6")
    actual.placedChips(1).selectedParticipants(1).trueOdds should be(26.0)
    actual.placedChips(1).selectedParticipants(1).status should be(Active)
    actual.placedChips(2).display should be("1")
    actual.placedChips(2).totalStake should be(1)
    actual.placedChips(2).selectedParticipants should have size (1)
    actual.placedChips(2).selectedParticipants(0).id should be("id1")
    actual.placedChips(2).selectedParticipants(0).position should be(1)
    actual.placedChips(2).selectedParticipants(0).displayOdds should be("5/2")
    actual.placedChips(2).selectedParticipants(0).trueOdds should be(1.0)
    actual.placedChips(2).selectedParticipants(0).status should be(Active)
  }


  test("'toJson()' SHOULD fail WHEN invalid operation") {
    // given
    val givenElement = Json.parse(
      """
{
  "meta": {
    "requestId": "9ccb02ec-3e42-4028-855d-d3cd127ee2cf",
    "operation": "WrongOperation",
    "eventId": "GOOG"
  }
}
    """)

    // when
    assertThrows[JsResultException] {
      objectUnderTest.fromJson(givenElement).asInstanceOf[JsResult[SubscribeEventReq]].get
    }

    // then
  }

  test("'toJson()' SHOULD fail WHEN malformed message") {
    // given
    val givenElement = Json.parse(
      """
{
  "meta": {
    "requestId": "9ccb02ec-3e42-4028-855d-d3cd127ee2cf",
    "operation": "SubscribeEvent",
    "event": 123
  }
}
    """)

    // when
    assertThrows[NoSuchElementException] {
      objectUnderTest.fromJson(givenElement).asInstanceOf[JsResult[SubscribeEventReq]].get
    }

    // then
  }
}

