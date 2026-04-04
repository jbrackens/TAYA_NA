package stella.leaderboard.models

import java.time.OffsetDateTime

import spray.json.DefaultJsonProtocol._
import spray.json.DefaultJsonProtocol.jsonFormat11
import spray.json.RootJsonFormat
import sttp.tapir.Schema

import stella.common.http.json.JsonFormats.offsetDateTimeFormat

final case class AggregationResult(
    position: Int,
    groupByFieldValue: String,
    windowRangeStart: Option[OffsetDateTime],
    windowRangeEnd: Option[OffsetDateTime],
    min: Float,
    max: Float,
    count: Int,
    sum: Float,
    custom: String,
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime)

object AggregationResult {

  implicit lazy val aggregationResultFormat: RootJsonFormat[AggregationResult] = jsonFormat11(AggregationResult.apply)

  implicit lazy val aggregationResultSchema: Schema[AggregationResult] = Schema.derived[AggregationResult]
}
