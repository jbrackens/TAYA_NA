package net.flipsports.gmx.common.internal.scala.json

import play.api.libs.json._

object EnumerationConverters {
  def enumReads[E <: Enumeration](enum: E): Reads[E#Value] = {
    case JsString(s) => {
      try {
        JsSuccess(enum.withName(s))
      } catch {
        case _: NoSuchElementException =>
          JsError(
            s"Enumeration expected of type: '${enum.getClass}', but it does not appear to contain the value: '$s ' ")
      }
    }
    case _ => JsError("String value expected")
  }

  implicit def enumWrites[E <: Enumeration]: Writes[E#Value] =
    (v: E#Value) => JsString(v.toString)

  implicit def enumFormat[E <: Enumeration](enum: E): Format[E#Value] =
    Format(enumReads(enum), enumWrites)
}
