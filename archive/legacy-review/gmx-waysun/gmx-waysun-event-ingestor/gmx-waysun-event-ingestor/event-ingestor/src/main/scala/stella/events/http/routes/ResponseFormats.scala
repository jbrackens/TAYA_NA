package stella.events.http.routes

import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat
import sttp.tapir.Schema
import sttp.tapir.generic.auto._

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.kafka.KafkaPublicationInfo

object ResponseFormats {

  val errorOutputFormats = new ErrorOutput.Formats()
  val errorOutputSchemas = new ErrorOutput.Schemas()

  implicit val kafkaPublicationInfoFormat: RootJsonFormat[KafkaPublicationInfo] =
    jsonFormat4(KafkaPublicationInfo.apply)

  implicit val kafkaPublicationInfoOptResponseFormat: RootJsonFormat[Response[Option[KafkaPublicationInfo]]] =
    Response.responseFormat[Option[KafkaPublicationInfo]]

  implicit val kafkaPublicationInfoOptResponseSchema: Schema[Response[Option[KafkaPublicationInfo]]] =
    Schema
      .derived[Response[Option[KafkaPublicationInfo]]]
      .modify(_.status)(_.description(s"OK status: ${Response.okStatus}"))
}
