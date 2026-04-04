package tech.argyll.gmx.predictorgame.common.play.api

import play.api.libs.json.{Format, JsValue, Json}

trait ResponseOps {

  implicit val faultResponseConverter: Format[ApiResponse[Boolean]] = Json.format[ApiResponse[Boolean]]

  protected def success[T](result: T)
                          (implicit converter: Format[ApiResponse[T]]): JsValue =
    Json.toJson(ApiResponse(Some(result), None))

  protected def fault[T](error: ApiError): JsValue =
    Json.toJson(ApiResponse(Option.empty[Boolean], Some(error)))

}
