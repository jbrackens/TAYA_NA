package stella.leaderboard.models

import java.util.UUID

import pl.iterators.kebs.tagged._
import spray.json.JsValue
import spray.json.RootJsonFormat
import sttp.tapir.Codec
import sttp.tapir.Codec.parsedString
import sttp.tapir.CodecFormat.TextPlain
import sttp.tapir.Schema
import sttp.tapir.SchemaType.SString

import stella.common.http.json.JsonFormats.uuidFormat
import stella.common.models.Ids._

object Ids {

  trait AggregationResultIdTag
  trait AggregationRuleTag

  type AggregationResultId = Long @@ AggregationResultIdTag
  type AggregationRuleId = UUID @@ AggregationRuleTag

  object AggregationResultId {
    def apply(id: Long): AggregationResultId = id.taggedWith[AggregationResultIdTag]
  }

  object AggregationRuleId {
    def apply(id: UUID): AggregationRuleId = id.taggedWith[AggregationRuleTag]

    // for test purposes
    def random(): AggregationRuleId = AggregationRuleId(UUID.randomUUID())

    implicit lazy val aggregationRuleIdFormat: RootJsonFormat[AggregationRuleId] =
      new RootJsonFormat[AggregationRuleId] {
        override def read(value: JsValue): AggregationRuleId = AggregationRuleId(uuidFormat.read(value))

        override def write(id: AggregationRuleId): JsValue = uuidFormat.write(id)
      }

    implicit lazy val aggregationRuleIdSchema: Schema[AggregationRuleId] =
      Schema[AggregationRuleId](SString()).format("uuid")

    implicit lazy val aggregationRuleIdCodec: Codec[String, AggregationRuleId, TextPlain] =
      parsedString[AggregationRuleId](str => AggregationRuleId(UUID.fromString(str))).schema(aggregationRuleIdSchema)
  }

  object ProjectIdInstances {
    implicit lazy val projectIdFormat: RootJsonFormat[ProjectId] =
      new RootJsonFormat[ProjectId] {
        override def read(value: JsValue): ProjectId = ProjectId(uuidFormat.read(value))

        override def write(id: ProjectId): JsValue = uuidFormat.write(id)
      }

    implicit lazy val projectIdSchema: Schema[ProjectId] =
      Schema[ProjectId](SString()).format("uuid")

    implicit lazy val projectIdCodec: Codec[String, ProjectId, TextPlain] =
      parsedString[ProjectId](str => ProjectId(UUID.fromString(str))).schema(projectIdSchema)
  }
}
