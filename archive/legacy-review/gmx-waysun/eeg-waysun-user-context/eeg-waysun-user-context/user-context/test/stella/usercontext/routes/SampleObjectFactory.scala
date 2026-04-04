package stella.usercontext.routes

import java.util.UUID

import scala.concurrent.Future

import akka.util.Timeout
import io.circe.Json
import io.circe.parser.parse
import org.scalatest.matchers.should
import play.api.http.HeaderNames
import play.api.http.MimeTypes
import play.api.http.Status.OK
import play.api.libs.json.JsObject
import play.api.libs.json.JsValue
import play.api.libs.json.{Json => PlayJson}
import play.api.mvc.Result
import play.api.test.FakeHeaders
import play.api.test.Helpers.contentAsString
import play.api.test.Helpers.contentType
import play.api.test.Helpers.status
import spray.json.JsonReader
import spray.json.enrichString

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.FullyPermissivePermissions
import stella.common.http.jwt.StellaAuthContext
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.usercontext.models.Ids.UserContextKey

object SampleObjectFactory extends should.Matchers {

  object JsonModificationData {
    val initialJson: Json = Json.fromFields(
      List(
        "fieldL1Object" -> Json.fromFields(List(
          "fieldL1ObjectL2Boolean" -> Json.False,
          "fieldL1ObjectL2Object2" -> Json.fromFields(Nil),
          "fieldL1ObjectL2Object3" -> Json.fromFields(List(
            "fieldL1ObjectL2Object3L3String" -> Json.fromString("You shall not pass!"),
            "fieldL1ObjectL2Object3L3String2" -> Json.fromString("Other string"),
            "fieldL1ObjectL2Object3L3Boolean" -> Json.False,
            "fieldL1ObjectL2Object3L3Null" -> Json.Null)))),
        "fieldL1Boolean" -> Json.True,
        "fieldL1Null" -> Json.Null,
        "fieldL1String" -> Json.fromString("Up the Irons!"),
        "fieldL1Number" -> Json
          .fromDouble(-12.5)
          .getOrElse(throw new Exception("Incorrect double. It should not happen")),
        "fieldL1Array" -> Json.fromValues(List(
          Json.Null,
          Json.fromFields(List(
            "fieldL1ArrayL2Number" -> Json
              .fromDouble(36.6)
              .getOrElse(throw new Exception("Incorrect double. It should not happen")),
            "fieldL1ArrayL2Null" -> Json.Null,
            "fieldL1ArrayL2Object" -> Json.fromFields(List("fieldL1ArrayL2ObjectL3Null" -> Json.Null)))),
          Json.fromInt(182)))))

    val initialJsonWithoutNulls: Json = Json.fromFields(
      List(
        "fieldL1Object" -> Json.fromFields(List(
          "fieldL1ObjectL2Boolean" -> Json.False,
          "fieldL1ObjectL2Object2" -> Json.fromFields(Nil),
          "fieldL1ObjectL2Object3" -> Json.fromFields(List(
            "fieldL1ObjectL2Object3L3String" -> Json.fromString("You shall not pass!"),
            "fieldL1ObjectL2Object3L3String2" -> Json.fromString("Other string"),
            "fieldL1ObjectL2Object3L3Boolean" -> Json.False)))),
        "fieldL1Boolean" -> Json.True,
        "fieldL1String" -> Json.fromString("Up the Irons!"),
        "fieldL1Number" -> Json
          .fromDouble(-12.5)
          .getOrElse(throw new Exception("Incorrect double. It should not happen")),
        "fieldL1Array" -> Json.fromValues(List(
          Json.fromFields(List(
            "fieldL1ArrayL2Number" -> Json
              .fromDouble(36.6)
              .getOrElse(throw new Exception("Incorrect double. It should not happen")),
            "fieldL1ArrayL2Object" -> Json.fromFields(List()))),
          Json.fromInt(182)))))

    val jsonDiff: Json = Json.fromFields(
      List(
        "fieldL1Object" -> Json.fromFields(List(
          "fieldL1ObjectL2Boolean" -> Json.True,
          "fieldL1ObjectL2Object2" -> Json.fromString("It's not object anymore"),
          "fieldL1ObjectL2Object3" -> Json.fromFields(List(
            "fieldL1ObjectL2Object3L3String" -> Json.fromString("You shall not pass [modified]!"),
            "fieldL1ObjectL2Object3L3String2" -> Json.Null,
            "fieldL1ObjectL2Object3L3ObjectNew" -> Json.fromFields(List(
              "fieldL1ObjectL2Object3L3ObjectL4ObjectNew" -> Json.fromString("It's new object!"),
              "fieldL1ObjectL2Object3L3ObjectL4Null" -> Json.Null)))))),
        "fieldL1Boolean" -> Json.False,
        "fieldL1String" -> Json.Null,
        "fieldL1Array" -> Json.fromValues(
          List(
            Json.Null,
            Json.fromFields(List("fieldL1ArrayL2NullNew" -> Json.Null, "fieldL1ArrayL2Object" -> Json.Null)),
            Json.fromString("New array element")))))

    val finalJson: Json = Json.fromFields(
      List(
        "fieldL1Object" -> Json.fromFields(List(
          "fieldL1ObjectL2Boolean" -> Json.True,
          "fieldL1ObjectL2Object2" -> Json.fromString("It's not object anymore"),
          "fieldL1ObjectL2Object3" -> Json.fromFields(List(
            "fieldL1ObjectL2Object3L3String" -> Json.fromString("You shall not pass [modified]!"),
            "fieldL1ObjectL2Object3L3Boolean" -> Json.False,
            "fieldL1ObjectL2Object3L3ObjectNew" -> Json.fromFields(
              List("fieldL1ObjectL2Object3L3ObjectL4ObjectNew" -> Json.fromString("It's new object!"))))))),
        "fieldL1Boolean" -> Json.False,
        "fieldL1Array" -> Json.fromValues(List(Json.fromFields(Nil), Json.fromString("New array element"))),
        "fieldL1Number" -> Json
          .fromDouble(-12.5)
          .getOrElse(throw new Exception("Incorrect double. It should not happen"))))
  }

  val defaultHeaders: FakeHeaders = FakeHeaders(Seq(HeaderNames.HOST -> "localhost"))
  val okStatus = "ok"

  val testProjectId: ProjectId = ProjectId.random()
  val testUserId: UserId = UserId.random()
  val testSenderUserId: UserId = UserId.random()

  val testUserContextKey: UserContextKey = UserContextKey(testProjectId, testUserId)
  val testSenderUserContextKey: UserContextKey = UserContextKey(testProjectId, testSenderUserId)

  val testJsonObject: JsValue = JsObject.empty

  val testCirceJson: Json = Json.fromFields(Nil)

  val userContextPath: String = "/user_context"

  val userContextAsAdminPath: String = getUserContextAsAdminPath(testProjectId, testUserId)

  val testAuthContext: StellaAuthContext =
    StellaAuthContext(
      FullyPermissivePermissions,
      userId = testSenderUserId,
      primaryProjectId = testProjectId,
      additionalProjectIds = Set.empty)

  def getUserContextAsAdminPath(projectId: UUID, userId: UUID): String = s"/user_context/admin/$projectId/$userId"

  def errorOutputResponse(errorCode: PresentationErrorCode): Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(errorCode))

  def errorOutputResponse(errorCode: PresentationErrorCode, errorMessage: String): Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(errorCode, errorMessage))

  def contentAs[T](res: Future[Result])(implicit reader: JsonReader[T], timeout: Timeout): T =
    reader.read(contentAsString(res).parseJson)

  def withOkStatusAndJsonContentAs[T](res: Future[Result])(implicit reader: JsonReader[T], timeout: Timeout): T = {
    status(res) shouldBe OK
    contentType(res) shouldBe Some(MimeTypes.JSON)
    contentAs(res)
  }

  def toCirceJson(json: JsValue): Json =
    parse(json.toString())
      .getOrElse(throw new IllegalArgumentException(s"$json should be parseable json and this error should not happen"))

  def toResultJson(json: JsValue): Json = toCirceJson(json).deepDropNullValues

  def toPlayJson(json: Json): JsValue = PlayJson.parse(json.toString())
}
