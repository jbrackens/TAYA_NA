package stella.common.http

import java.time.OffsetDateTime

import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat
import sttp.tapir.Schema

import stella.common.http.json.JsonFormats.offsetDateTimeFormat

final case class AggregationWindow(
    elements: Int,
    windowRangeStart: Option[OffsetDateTime],
    windowRangeEnd: Option[OffsetDateTime])

object AggregationWindow {
  implicit lazy val aggregationWindowFormat: RootJsonFormat[AggregationWindow] = jsonFormat3(AggregationWindow.apply)

  implicit lazy val aggregationWindowSchema: Schema[AggregationWindow] =
    Schema.derived[AggregationWindow]
}
