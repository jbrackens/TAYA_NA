package phoenix.payments.infrastructure.http

import scala.util.Try
import scala.xml.Utility
import scala.xml.XML

import cats.data.Validated
import org.slf4j.LoggerFactory
import sttp.tapir.Codec
import sttp.tapir.Codec.PlainCodec
import sttp.tapir.CodecFormat.Xml
import sttp.tapir.DecodeResult
import sttp.tapir.Mapping
import sttp.tapir.Validator

import phoenix.core.ScalaObjectUtils._
import phoenix.core.XmlUtils.XmlFormat

object TapirXMLAdapter {
  private val log = LoggerFactory.getLogger(this.objectName)

  implicit def xmlCodec[T: XmlFormat]: Codec.XmlCodec[T] =
    implicitly[PlainCodec[String]].map(xmlMapping).format(Xml())

  private def xmlMapping[T: XmlFormat]: Mapping[String, T] =
    new Mapping[String, T] {
      override def rawDecode(xmlString: String): DecodeResult[T] = {
        val parsingAttempt = Try {
          val xml = XML.loadString(xmlString.trim)
          log.debug("Parsing xml body {}", Utility.trim(xml))
          XmlFormat[T].read(xml) match {
            case Validated.Valid(xml) => xml
            case Validated.Invalid(error) =>
              log.warn("Failed to parse xml due to {}", error)
              throw new RuntimeException("Unable to parse XML request body")
          }
        }
        parsingAttempt.fold(DecodeResult.Error(xmlString, _), DecodeResult.Value(_))
      }

      override def encode(xml: T): String =
        XmlFormat[T].write(xml).toString()

      override def validator: Validator[T] =
        Validator.pass[T]
    }
}
