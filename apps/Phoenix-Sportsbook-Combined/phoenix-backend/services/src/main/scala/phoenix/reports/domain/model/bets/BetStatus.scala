package phoenix.reports.domain.model.bets

import scala.collection.immutable.IndexedSeq

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

sealed trait BetStatus extends EnumEntry with UpperSnakecase

object BetStatus extends Enum[BetStatus] {
  def values: IndexedSeq[BetStatus] = findValues

  final case object Open extends BetStatus
}
