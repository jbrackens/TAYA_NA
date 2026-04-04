package tech.argyll.gmx.predictorgame.common.play.api

import play.api.libs.json.{Format, Json}

case class ApiError(code: String, message: String)

object ApiError {
  implicit val errorConverter: Format[ApiError] = Json.format[ApiError]
}
