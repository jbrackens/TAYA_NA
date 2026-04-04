package net.flipsports.gmx.common.internal.scala.json

import play.api.libs.functional.syntax._
import play.api.libs.json.Reads._
import play.api.libs.json._

object EitherConverters {

  implicit def eitherReads[L: Format, R: Format]: Reads[Either[L, R]] =
    (__ \ "eitherLeft").read[L].map(Left(_)) |
      (__ \ "eitherRight").read[R].map(Right(_))

  implicit def eitherWrites[L: Format, R: Format]: Writes[Either[L, R]] = (either: Either[L, R]) => Json.obj(
    either match {
      case Left(value) => "eitherLeft" -> Json.toJson(value)
      case Right(value) => "eitherRight" -> Json.toJson(value)
    }
  )
}
