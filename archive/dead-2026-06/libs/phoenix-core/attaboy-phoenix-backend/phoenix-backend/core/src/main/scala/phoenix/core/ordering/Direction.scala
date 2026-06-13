package phoenix.core.ordering

import scala.collection.immutable

import enumeratum.EnumEntry.UpperSnakecase
import enumeratum._

sealed trait Direction extends EnumEntry with UpperSnakecase

object Direction extends Enum[Direction] {
  case object Ascending extends Direction
  case object Descending extends Direction

  override def values: immutable.IndexedSeq[Direction] = findValues
}
