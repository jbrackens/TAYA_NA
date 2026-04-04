package phoenix.cluster

import scala.collection.immutable.IndexedSeq

import enumeratum.EnumEntry.UpperSnakecase
import enumeratum._

sealed abstract class NodeRole(override val entryName: String) extends EnumEntry with UpperSnakecase

object NodeRole extends Enum[NodeRole] {
  override def values: IndexedSeq[NodeRole] = findValues

  final case object BetsRole extends NodeRole("bets")
  final case object MarketsRole extends NodeRole("markets")
  final case object WalletsRole extends NodeRole("wallets")
  final case object ReportsRole extends NodeRole("reports")
  final case object PuntersRole extends NodeRole("punters")
}
