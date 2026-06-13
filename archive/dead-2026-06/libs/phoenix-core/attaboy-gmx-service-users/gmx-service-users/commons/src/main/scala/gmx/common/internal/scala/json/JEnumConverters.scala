package gmx.common.internal.scala.json

import play.api.libs.json._

object JEnumConverters {

  def enumFormat[T <: Enum[_]](mkEnum: String => T): Format[T] =
    Format(
      enumReads(mkEnum),
      enumWrites
    )

  def enumReads[T <: Enum[_]](mkEnum: String => T): Reads[T] = {
    case JsString(s) =>
      try JsSuccess(mkEnum(s))
      catch {
        case _: IllegalArgumentException =>
          JsError("Not a valid enum value: " + s)
      }
    case v => JsError("Can't convert to enum: " + v)
  }

  def enumWrites[T <: Enum[_]]: Writes[T] = (e: T) => JsString(e.toString)
}
