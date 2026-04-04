package stella.common.http

import java.util.UUID

import scala.util.Failure
import scala.util.Success
import scala.util.Try

import pl.iterators.kebs.macros.CaseClass1Rep
import spray.json.DefaultJsonProtocol
import spray.json.JsValue
import spray.json.JsonFormat
import spray.json.RootJsonFormat
import spray.json.deserializationError
import sttp.tapir.Codec
import sttp.tapir.CodecFormat.TextPlain
import sttp.tapir.Schema

import stella.common.http.json.JsonFormats

object instances extends DefaultJsonProtocol with JsonFormats {

  implicit def taggedJsonFormat[T, TT](implicit ev: CaseClass1Rep[T, TT], f: JsonFormat[TT]): JsonFormat[T] =
    new RootJsonFormat[T] {
      override def read(value: JsValue): T = Try(ev.apply(f.read(value))) match {
        case Success(value)     => value
        case Failure(exception) => deserializationError(exception.getMessage)
      }
      override def write(x: T): JsValue = f.write(ev.unapply(x))
    }

  implicit def taggedIdSchema[T, TT](implicit ev: CaseClass1Rep[T, TT], stt: Schema[TT]): Schema[T] =
    stt.map(tt => Some(ev.apply(tt)))(ev.unapply)

  implicit def taggedGenericCodec[T, TT](implicit
      ev: CaseClass1Rep[T, TT],
      c: Codec[TT, TT, TextPlain]): Codec[TT, T, TextPlain] =
    c.map(ev.apply)(ev.unapply)

  implicit def taggedIdStringCodec[T, TT](implicit ev: CaseClass1Rep[T, UUID]): Codec[String, T, TextPlain] =
    implicitly[Codec[String, String, TextPlain]].map(s => ev.apply(UUID.fromString(s)))(ev.unapply.andThen(_.toString))
}
