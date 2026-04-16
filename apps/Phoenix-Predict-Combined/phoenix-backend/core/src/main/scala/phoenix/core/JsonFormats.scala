package phoenix.core

import java.time._
import java.util.UUID
import java.util.concurrent.TimeUnit

import scala.concurrent.duration.FiniteDuration
import scala.util.Try

import cats.data.NonEmptyList
import cats.syntax.either._
import enumeratum.Circe
import enumeratum.Enum
import enumeratum.EnumEntry
import io.circe._

import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.ValidationException

object JsonFormats {
  def enumCodec[T <: EnumEntry](anEnum: Enum[T]): Codec[T] =
    Codec.from(Circe.decodeCaseInsensitive(anEnum), Circe.encoder(anEnum))

  implicit val stringCodec: Codec[String] = Codec.from(Decoder.decodeString, Encoder.encodeString)

  implicit val intCodec: Codec[Int] = Codec.from(Decoder.decodeInt, Encoder.encodeInt)

  implicit val floatCodec: Codec[Float] = Codec.from(Decoder.decodeFloat, Encoder.encodeFloat)

  implicit def listCodec[T: Codec]: Codec[List[T]] = Codec.from(Decoder.decodeList, Encoder.encodeList)

  implicit def seqCodec[T: Codec]: Codec[Seq[T]] = Codec.from(Decoder.decodeSeq, Encoder.encodeSeq)

  implicit val offsetDateTimeCodec: Codec[OffsetDateTime] =
    Codec.from(Decoder.decodeOffsetDateTime, Encoder.encodeOffsetDateTime)

  implicit val bigDecimalCodec: Codec[BigDecimal] = Codec.from(Decoder.decodeBigDecimal, Encoder.encodeBigDecimal)

  implicit val uuidCodec: Codec[UUID] = Codec.from(Decoder.decodeUUID, Encoder.encodeUUID)

  implicit def nonEmptyListCodec[T: Codec]: Codec[NonEmptyList[T]] =
    Codec.from(Decoder.decodeNonEmptyList, Encoder.encodeNonEmptyList)

  implicit object FiniteDurationCodec extends Codec[FiniteDuration] {
    override def apply(fd: FiniteDuration): Json =
      Json.obj("length" -> Json.fromLong(fd.length), "unit" -> Json.fromString(fd.unit.name))
    override def apply(c: HCursor): Decoder.Result[FiniteDuration] =
      for {
        length <- c.downField("length").as[BigDecimal]
        unit <- c.downField("unit").as[String]
        result <- parseDuration(length, unit).toEither.left.map(_ => c.failure("Invalid Duration(length, unit)"))
      } yield result

    private def parseDuration(length: BigDecimal, unit: String): Try[FiniteDuration] =
      Try(FiniteDuration(length.toLongExact, TimeUnit.valueOf(unit))).filter(duration => duration.length > 0)
  }

  implicit class CodecOps[T](codec: Codec[T]) {
    def dropNullValues: Codec[T] =
      new Codec[T] {
        override def apply(c: HCursor): Decoder.Result[T] = codec(c)
        override def apply(a: T): Json = codec(a).dropNullValues
      }
    def bimap[T1](asT: T1 => T, fromT: T => T1): Codec[T1] = codec.iemap(t => Right(fromT(t)))(asT)
    def bimapValidated[T1](asT: T1 => T, fromT: T => Validation[T1]): Codec[T1] =
      codec.iemap(t => fromT(t).leftMap(errors => ValidationException.combineErrors(errors).message).toEither)(asT)
    def bimapTry[T1](asT: T1 => T, fromT: T => Try[T1]): Codec[T1] =
      codec.iemap(t => fromT(t).toEither.leftMap(_.toString))(asT)
  }

  implicit class PhoenixEncoderOps[T](encoder: Encoder[T]) {
    def dropNullValues: Encoder[T] = Encoder.instance[T](encoder(_).dropNullValues)
  }

  implicit class HCursorOps(c: HCursor) {
    def failure(reason: String): DecodingFailure = DecodingFailure(reason, c.history)
    def fail[T](reason: String): Decoder.Result[T] = Left(failure(reason))
  }
}
