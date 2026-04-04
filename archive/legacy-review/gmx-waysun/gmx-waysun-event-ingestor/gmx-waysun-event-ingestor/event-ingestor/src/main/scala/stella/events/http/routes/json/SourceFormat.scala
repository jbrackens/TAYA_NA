package stella.events.http.routes.json

import spray.json.DeserializationException
import spray.json.JsString
import spray.json.JsValue
import spray.json.RootJsonFormat
import sttp.tapir.Schema
import sttp.tapir.SchemaType.SString

import stella.dataapi.platformevents.Source

object SourceFormat {
  implicit val sourceFormat: RootJsonFormat[Source] = new RootJsonFormat[Source] {

    override def read(json: JsValue): Source = json match {
      case JsString(sourceValue) =>
        Source
          .values()
          .find(_.name() == sourceValue)
          .getOrElse(reportError(s"""Expected one of ${Source.values().mkString(", ")} but found $sourceValue"""))
      case _ => reportError(s"Expected String but found $json")
    }

    override def write(obj: Source): JsValue = JsString(obj.name())

    private def reportError(message: String) = throw DeserializationException(message)
  }

  implicit val sourceSchema: Schema[Source] =
    Schema[Source](schemaType = SString(), description = Some(s"""One of: ${Source.values().mkString(", ")}"""))
}
