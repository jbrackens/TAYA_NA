package stella.leaderboard.models

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.Lowercase
import enumeratum.EnumEntry.Snakecase
import enumeratum.PlayJsonEnum
import pl.iterators.kebs.json.KebsEnumFormats.jsonEnumFormat
import spray.json.JsonFormat
import sttp.tapir.Codec
import sttp.tapir.Codec.parsedString
import sttp.tapir.CodecFormat.TextPlain
import sttp.tapir.Schema
import sttp.tapir.SchemaType.SString
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum

final case class OrderByFilters(filters: Seq[OrderByFilter]) {
  def toQueryParam: String = filters.map(f => s"${f.direction.entryName}_${f.orderByType.entryName}").mkString(",")
}

object OrderByFilters {

  implicit lazy val orderByFiltersSchema: Schema[OrderByFilters] = Schema[OrderByFilters](SString())

  implicit lazy val orderByFiltersCodec: Codec[String, OrderByFilters, TextPlain] =
    parsedString[OrderByFilters] { str =>
      val filters = str.split(",").toList.flatMap(parseOrderBy)
      if (filters.isEmpty) throw new IllegalArgumentException(s"'$str' is not valid OrderBy parameter")
      val finalFilters = removeOverriddenFilters(filters)
      OrderByFilters(finalFilters)
    }

  lazy val empty: OrderByFilters = OrderByFilters(Nil)

  val description: String = {
    val orderingTypesDescription = OrderByDirection.values.map(_.entryName).mkString(", ")
    val fieldNamesDescription = OrderByType.values.map(_.entryName).mkString(", ")
    val exampleFilterWithSign = s"${OrderByDirection.Desc.entryName}_${OrderByType.Max.entryName}"
    val exampleFilterWithSign2 = s"${OrderByDirection.Asc.entryName}_${OrderByType.Count.entryName}"
    val compoundExample = s"$exampleFilterWithSign,$exampleFilterWithSign2"

    s"""A comma-separated list of filters $${ordering_type}_$${field_name}, where:
       |
       | - ordering_type is one of: $orderingTypesDescription
       |
       | - field_name is one of: $fieldNamesDescription
       |
       | E.g. "$compoundExample"
       |""".stripMargin
  }

  private def parseOrderBy(value: String): List[OrderByFilter] = {
    value.trim.split("_", 2) match {
      case Array(directionName, orderByTypeName) =>
        val directionOpt = OrderByDirection.findByName(directionName)
        val orderByTypeOpt = OrderByType.findByName(orderByTypeName)
        (directionOpt, orderByTypeOpt) match {
          case (Some(direction), Some(orderByType)) =>
            List(OrderByFilter(direction, orderByType))
          case _ =>
            throw new IllegalArgumentException(s"'$value' is not valid OrderBy parameter")
        }
      case _ => throw new IllegalArgumentException(s"'$value' is not valid OrderBy parameter")
    }
  }

  def removeOverriddenFilters(filters: Seq[OrderByFilter]): Seq[OrderByFilter] =
    filters.reverse.distinctBy(_.orderByType).reverse
}

final case class OrderByFilter(direction: OrderByDirection, orderByType: OrderByType)

sealed trait OrderByDirection extends EnumEntry with Lowercase with TapirCodecEnumeratum

object OrderByDirection extends Enum[OrderByDirection] with PlayJsonEnum[OrderByDirection] {

  case object Asc extends OrderByDirection

  case object Desc extends OrderByDirection

  def values: IndexedSeq[OrderByDirection] = findValues

  def findByName(name: String): Option[OrderByDirection] = values.find(_.entryName == name)
}

sealed trait OrderByType extends EnumEntry with Snakecase with TapirCodecEnumeratum

object OrderByType extends Enum[OrderByType] with PlayJsonEnum[OrderByType] {

  case object FieldValue extends OrderByType
  case object Min extends OrderByType
  case object Max extends OrderByType
  case object Sum extends OrderByType
  case object Count extends OrderByType

  implicit lazy val orderByTypeFormat: JsonFormat[OrderByType] = jsonEnumFormat

  def values: IndexedSeq[OrderByType] = findValues

  def findByName(name: String): Option[OrderByType] = values.find(_.entryName == name)
}
