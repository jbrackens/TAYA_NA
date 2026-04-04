package stella.events.http.routes.json

import spray.json.DefaultJsonProtocol._
import spray.json.DefaultJsonProtocol.jsonFormat2
import spray.json.RootJsonFormat
import sttp.tapir.Schema

import stella.dataapi.platformevents.{Field => DataApiField}
import stella.dataapi.validators.FieldConstants.valueFieldDescription
import stella.dataapi.validators.FieldType

final case class Field(name: String, value: String) {
  def toDataApi = new DataApiField(name, value)
}

object Field {
  implicit val fieldFormat: RootJsonFormat[Field] = jsonFormat2(Field.apply)

  implicit val fieldSchema: Schema[Field] =
    Schema
      .derived[Field]
      .modify(_.name)(
        _.description("Event field name matching one in the event configuration").encodedExample("hidden_chests_found"))
      .modify(_.value)(
        _.description(s"""A string representation of a value for one of the given types: ${FieldType.values
          .map(_.name)
          .mkString(", ")}. $valueFieldDescription""".stripMargin).encodedExample("17"))
}
