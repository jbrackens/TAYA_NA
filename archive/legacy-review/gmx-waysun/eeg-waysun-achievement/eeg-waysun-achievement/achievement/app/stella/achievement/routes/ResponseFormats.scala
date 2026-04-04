package stella.achievement.routes

import java.util.UUID

import play.api.libs.json._
import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat
import sttp.tapir.Schema

import stella.common.http.AggregationWindow
import stella.common.http.PaginatedResult
import stella.common.http.Response
import stella.common.http.error.ErrorOutput

import stella.achievement.models.AchievementEvent

object ResponseFormats {

  val errorOutputFormats = new ErrorOutput.Formats()
  val errorOutputSchemas = new ErrorOutput.Schemas()

  implicit lazy val achievementEventsResponseFormat: RootJsonFormat[Response[Seq[AchievementEvent]]] =
    Response.responseFormat[Seq[AchievementEvent]]

  implicit lazy val aggregationWindowSeqResponseFormat: RootJsonFormat[Response[Seq[AggregationWindow]]] =
    Response.responseFormat[Seq[AggregationWindow]]

  implicit lazy val achievementEventsPageResponseFormat: RootJsonFormat[Response[PaginatedResult[AchievementEvent]]] =
    Response.responseFormat[PaginatedResult[AchievementEvent]]

  implicit lazy val achievementEventsPageFormat: RootJsonFormat[PaginatedResult[AchievementEvent]] = jsonFormat4(
    PaginatedResult[AchievementEvent])

  implicit lazy val achievementEventsPageSchema: Schema[PaginatedResult[AchievementEvent]] =
    Schema.derived[PaginatedResult[AchievementEvent]]

  implicit lazy val uuidPlayFormat: Format[UUID] = new Format[UUID] {
    override def reads(json: JsValue): JsResult[UUID] = json match {
      case JsString(value) =>
        try {
          val uuid = UUID.fromString(value)
          JsSuccess(uuid)
        } catch {
          case e: IllegalArgumentException => JsError(e.getMessage)
        }
      case _ => JsError(s"Got $json but UUID String was expected")
    }

    override def writes(o: UUID): JsValue = JsString(o.toString)
  }
}
