package phoenix.core

import java.time.LocalDate
import java.time.OffsetDateTime

import scala.util.Try
import scala.xml.Elem
import scala.xml.Node
import scala.xml.NodeSeq
import scala.xml.XML

import cats.data.NonEmptyList
import cats.data.Validated
import cats.data.ValidatedNel
import cats.syntax.traverse._
import cats.syntax.validated._
import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.NoSuchMember

import phoenix.core.XmlUtils.XmlNodeReader.read
import phoenix.core.validation.ValidationException

object XmlUtils {

  sealed trait XmlError
  final case class FailedToConvertStringToXml(cause: Throwable) extends XmlError
  final case class NoAttributeWithName(node: Node, name: String) extends XmlError
  final case class NoDescendantWithName(name: String) extends XmlError
  final case object NoDescendants extends XmlError
  final case class InvalidAttributeValue(causes: NonEmptyList[ValidationException]) extends XmlError
  final case class UnexpectedValueError(message: String) extends XmlError

  type ValidationResult[T] = ValidatedNel[XmlError, T]

  trait XmlFormat[T] extends XmlNodeReader[T] with XmlWriter[T]

  object XmlFormat {
    def apply[T](implicit ev: XmlFormat[T]): XmlFormat[T] = ev

    def instance[T](reader: XmlNodeReader[T], writer: XmlWriter[T]): XmlFormat[T] =
      new XmlFormat[T] {
        override def write(t: T): Node = writer.write(t)
        override def read(node: Node): ValidationResult[T] = reader.read(node)
      }

    def writeOnly[T](writer: XmlWriter[T]): XmlFormat[T] =
      instance(reader = _ => throw new NotImplementedError("Reading not supported"), writer)

    def readOnly[T](reader: XmlNodeReader[T]): XmlFormat[T] =
      instance(reader, writer = _ => throw new NotImplementedError("Writing not supported"))
  }

  trait XmlNodeReader[T] {
    def read(node: Node): ValidationResult[T]
  }

  object XmlNodeReader {
    def apply[T](implicit ev: XmlNodeReader[T]): XmlNodeReader[T] = ev

    def read[T: XmlNodeReader](xml: Node): ValidationResult[T] = XmlNodeReader[T].read(xml)
  }

  trait XmlNamedAttributeReader[T] {
    def readAttribute(node: Node, name: String): ValidationResult[T]
  }

  trait XmlAttributeReader[T] {
    def readAttribute(node: Node): ValidationResult[T]
  }

  trait XmlWriter[T] {
    def write(t: T): Node
  }

  object XmlWriter {
    def apply[T](implicit ev: XmlWriter[T]): XmlWriter[T] = ev

    def write[T: XmlWriter](t: T): Node = XmlWriter[T].write(t)
  }

  object DefaultXmlAttributeReaders {

    private def validNone[T]: ValidationResult[Option[T]] = None.validNel

    implicit val stringAttributeReader: XmlNamedAttributeReader[String] =
      (node, name) =>
        node
          .attribute(name)
          .map(_.toList match {
            case Nil       => NoAttributeWithName(node, name).invalidNel
            case head :: _ => head.toString().trim.validNel
          })
          .getOrElse(NoAttributeWithName(node, name).invalidNel)

    implicit val intAttributeReader: XmlNamedAttributeReader[Int] =
      (node, name) => node.readAttribute[String, Int](name, _.toInt)

    implicit val longAttributeReader: XmlNamedAttributeReader[Long] =
      (node, name) => node.readAttribute[String, Long](name, _.toLong)

    implicit val booleanAttributeReader: XmlNamedAttributeReader[Boolean] =
      (node, name) => node.readAttribute[String, Boolean](name, _.toBoolean)

    implicit val bigDecimalXmlAttributeReader: XmlNamedAttributeReader[BigDecimal] =
      (node, name) => node.readAttribute[String, BigDecimal](name, BigDecimal(_))

    implicit def optionalNamedAttributeReader[T: XmlNamedAttributeReader]: XmlNamedAttributeReader[Option[T]] =
      (node, name) => node.readAttributeForName[T](name).map(Some(_)).orElse(validNone[T])

    implicit def optionalAttributeReader[T: XmlAttributeReader]: XmlAttributeReader[Option[T]] =
      node => node.readAttribute[T].map(Some(_)).orElse(validNone[T])
  }

  object DefaultXmlNodeReaders {
    implicit val stringNodeReader: XmlNodeReader[String] =
      node => node.text.valid

    implicit val intNodeReader: XmlNodeReader[Int] =
      node => node.text.trim.toInt.valid

    implicit val bigDecimalNodeReader: XmlNodeReader[BigDecimal] =
      node => BigDecimal(node.text.trim).valid

    implicit val offsetDateTimeReader: XmlNodeReader[OffsetDateTime] = node =>
      read[String](node).andThen(
        dateTimeString =>
          Validated
            .fromTry(Try(OffsetDateTime.parse(dateTimeString)))
            .leftMap(_ =>
              NonEmptyList.one(UnexpectedValueError(s"Expected valid OffsetDateTime, but got '$dateTimeString'"))))

    implicit val localDateReader: XmlNodeReader[LocalDate] = node =>
      read[String](node).andThen(
        dateString =>
          Validated
            .fromTry(Try(LocalDate.parse(dateString)))
            .leftMap(_ => NonEmptyList.one(UnexpectedValueError(s"Expected valid DateTime, but got '$dateString'"))))

    def enumReader[T <: EnumEntry](anEnum: Enum[T]): XmlNodeReader[T] =
      enumReader(enumString => anEnum.withNameEither(enumString))

    def enumReader[T <: EnumEntry](factory: String => Either[NoSuchMember[T], T]): XmlNodeReader[T] =
      node =>
        read[String](node).andThen(
          enumString =>
            Validated
              .fromEither(factory(enumString))
              .leftMap(_ =>
                NonEmptyList.one(UnexpectedValueError(s"Expected valid enum string, but got '$enumString'"))))
  }

  implicit class NodeOps(self: Node) {

    import DefaultXmlAttributeReaders.stringAttributeReader

    def readAttribute[FROM, TO](name: String, conversionFn: FROM => TO)(implicit
        reader: XmlNamedAttributeReader[FROM]): ValidationResult[TO] =
      self.readAttributeForName[FROM](name).map(conversionFn)

    def readAttribute[T](implicit reader: XmlAttributeReader[T]): ValidationResult[T] =
      reader.readAttribute(self)

    def readAttributeForName[T](name: String)(implicit reader: XmlNamedAttributeReader[T]): ValidationResult[T] =
      reader.readAttribute(self, name)

    def readAttributeForNameAsEnum[E <: EnumEntry](name: String)(implicit e: Enum[E]): ValidationResult[E] = {
      self.readAttributeForName[String](name).andThen { attribute =>
        Validated.fromEither(e.withNameInsensitiveEither(attribute)).leftMap { error =>
          NonEmptyList.one(InvalidAttributeValue(
            NonEmptyList.one(ValidationException(s"Failed to convert attribute value: [$attribute]", Some(error)))))
        }
      }
    }

    def convertTo[T](implicit reader: XmlNodeReader[T]): ValidationResult[T] =
      reader.read(self)
  }

  implicit class NodeSeqOps(self: NodeSeq) {

    def convertTo[T](implicit reader: XmlNodeReader[T]): ValidationResult[List[T]] =
      self.map(_.convertTo[T]).toList.sequence

    def convertDescendantsTo[T](name: String)(implicit reader: XmlNodeReader[T]): ValidationResult[List[T]] =
      (self \\ name).convertTo[T]

    def convertFirstDescendantTo[T](name: String)(implicit reader: XmlNodeReader[T]): ValidationResult[T] =
      (self \\ name).toList match {
        case Nil       => NoDescendantWithName(name).invalidNel
        case head :: _ => reader.read(head)
      }

    def convertHead[T](implicit reader: XmlNodeReader[T]): ValidationResult[T] =
      self.toList match {
        case Nil       => NoDescendants.invalidNel
        case head :: _ => reader.read(head)
      }

    def convertHeadOption[T](implicit reader: XmlNodeReader[T]): ValidationResult[Option[T]] =
      self.toList match {
        case Nil       => None.validNel
        case head :: _ => reader.read(head).map(Some(_))
      }
  }

  implicit class XmlStringOps(self: String) {

    def parseNodeSeq: NodeSeq =
      XML.loadString(self)

    def parseXml: Elem =
      XML.loadString(self)

    def parseXmlValidated: ValidationResult[Elem] =
      try {
        XML.loadString(self).validNel[XmlError]
      } catch {
        case e: Exception => FailedToConvertStringToXml(e).invalidNel[Elem]
      }
  }
}
