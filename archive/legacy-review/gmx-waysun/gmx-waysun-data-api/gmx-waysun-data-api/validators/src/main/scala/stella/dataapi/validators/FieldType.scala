package stella.dataapi.validators

import scala.util.matching.Regex

import ca.mrvisser.sealerate

sealed trait FieldType {
  def name: String

  def validate(value: String): Either[String, Unit]
}

object FieldType {
  val values: Set[FieldType] = sealerate.values[FieldType]

  case object Boolean extends FieldType {
    override val name: String = "boolean"

    override def validate(value: String): Either[String, Unit] = {
      val lowerCaseValue = value.toLowerCase()
      Either.cond(lowerCaseValue == "true" || lowerCaseValue == "false", (), s"'$value' is not correct $name")
    }
  }

  case object String extends FieldType {
    override val name: String = "string"

    override def validate(value: String): Either[String, Unit] = Right(())
  }

  case object Integer extends FieldType {
    private val intRegex = """^-?\d+""".r
    override val name: String = "integer"

    override def validate(value: String): Either[String, Unit] = validateMatchesRegex(intRegex, value, name)
  }

  case object Float extends FieldType {
    private val decimalRegex = """^-?\d+(\.\d)?\d*""".r
    override val name: String = "float"

    override def validate(value: String): Either[String, Unit] = validateMatchesRegex(decimalRegex, value, name)
  }

  private def validateMatchesRegex(regex: Regex, value: String, typeName: String): Either[String, Unit] =
    Either.cond(regex.unapplySeq(value).isDefined, (), s"'$value' is not correct $typeName")
}
