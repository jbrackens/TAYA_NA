package stella.rules.routes

import java.util.UUID

import play.api.libs.json.Format
import play.api.libs.json.JsError
import play.api.libs.json.JsResult
import play.api.libs.json.JsString
import play.api.libs.json.JsSuccess
import play.api.libs.json.{JsValue => PlayJsValue}
import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat

import stella.common.http.Response
import stella.common.http.error.ErrorOutput

import stella.rules.models.achievement.http.AchievementRuleConfiguration
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.event.http.EventConfiguration
import stella.rules.routes.error.AdditionalPresentationErrorCode

object ResponseFormats {

  val errorOutputFormats = new ErrorOutput.Formats(AdditionalPresentationErrorCode.values.toSeq: _*)
  val errorOutputSchemas = new ErrorOutput.Schemas(AdditionalPresentationErrorCode.values.toSeq: _*)

  implicit lazy val eventConfigurationResponseFormat: RootJsonFormat[Response[EventConfiguration]] =
    Response.responseFormat[EventConfiguration]

  implicit lazy val eventConfigurationSeqResponseFormat: RootJsonFormat[Response[Seq[EventConfiguration]]] =
    Response.responseFormat[Seq[EventConfiguration]]

  implicit lazy val aggregationRuleConfigurationResponseFormat: RootJsonFormat[Response[AggregationRuleConfiguration]] =
    Response.responseFormat[AggregationRuleConfiguration]

  implicit lazy val aggregationRuleConfigurationSeqResponseFormat
      : RootJsonFormat[Response[Seq[AggregationRuleConfiguration]]] =
    Response.responseFormat[Seq[AggregationRuleConfiguration]]

  implicit lazy val achievementRuleConfigurationResponseFormat: RootJsonFormat[Response[AchievementRuleConfiguration]] =
    Response.responseFormat[AchievementRuleConfiguration]

  implicit lazy val achievementRuleConfigurationSeqResponseFormat
      : RootJsonFormat[Response[Seq[AchievementRuleConfiguration]]] =
    Response.responseFormat[Seq[AchievementRuleConfiguration]]

  implicit lazy val uuidPlayFormat: Format[UUID] = new Format[UUID] {
    override def reads(json: PlayJsValue): JsResult[UUID] = json match {
      case JsString(value) =>
        try {
          val uuid = UUID.fromString(value)
          JsSuccess(uuid)
        } catch {
          case e: IllegalArgumentException => JsError(e.getMessage)
        }
      case _ => JsError(s"Got $json but UUID String was expected")
    }

    override def writes(o: UUID): PlayJsValue = JsString(o.toString)
  }
}
