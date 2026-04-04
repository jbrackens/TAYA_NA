package stella.usercontext.routes

import io.circe.Json
import io.circe.parser._
import spray.json.JsValue
import spray.json.RootJsonFormat
import spray.json.enrichString
import sttp.tapir.Schema
import sttp.tapir.SchemaType.SProduct

import stella.common.http.Response
import stella.common.http.error.ErrorOutput

object ResponseFormats {

  val errorOutputFormats = new ErrorOutput.Formats()
  val errorOutputSchemas = new ErrorOutput.Schemas()

  implicit lazy val circeJsonObjectSprayFormat: RootJsonFormat[Json] = new RootJsonFormat[Json] {
    override def read(json: JsValue): Json = parse(json.toString()) match {
      case Left(e)                        => throw e
      case Right(value) if value.isObject => value
      case Right(_)                       => throw new IllegalArgumentException(s"$json is not JSON object")
    }

    override def write(obj: Json): JsValue = obj.toString().parseJson
  }

  implicit lazy val circeJsonResponseSprayFormat: RootJsonFormat[Response[Json]] = Response.responseFormat[Json]

  implicit lazy val circeJsonTapirSchema: Schema[Json] =
    Schema(schemaType = SProduct(fields = Nil), description = Some("Custom JSON object"))
}
