package phoenix.core.domain
import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

sealed abstract class EntityType(val prefix: String) extends EnumEntry with UpperSnakecase
object EntityType extends Enum[EntityType] {
  override def values: IndexedSeq[EntityType] = findValues
  case object Fixture extends EntityType("f")
  case object Tournament extends EntityType("t")
  case object Competitor extends EntityType("c")
  case object Market extends EntityType("m")
  case object Sport extends EntityType("s")
}
