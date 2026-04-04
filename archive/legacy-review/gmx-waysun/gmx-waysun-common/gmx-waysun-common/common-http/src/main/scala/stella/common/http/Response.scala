package stella.common.http

import spray.json.DefaultJsonProtocol._
import spray.json.DefaultJsonProtocol.jsonFormat2
import spray.json.JsonFormat
import spray.json.RootJsonFormat

/** Represents the required HTTP response format (also in case of error) */
final case class Response[+T] private (status: String, details: T)

object Response {
  val okStatus = "ok"
  val errorStatus = "error"

  def asSuccess[T](details: T): Response[T] = Response(okStatus, details)
  def asFailure[T](details: T): Response[T] = Response(errorStatus, details)

  def responseFormat[T: JsonFormat]: RootJsonFormat[Response[T]] = jsonFormat2(Response[T])
}
