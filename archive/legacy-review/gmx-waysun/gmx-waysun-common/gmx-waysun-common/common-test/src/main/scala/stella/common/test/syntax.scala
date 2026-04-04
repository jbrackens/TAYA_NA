package stella.common.test

import play.api.libs.json.JsObject
import play.api.libs.json.OFormat

object syntax {
  implicit final class RequestOps[T](val request: T) extends AnyVal {
    def toJson(implicit oFormat: OFormat[T]): JsObject = oFormat.writes(request)
  }
}
