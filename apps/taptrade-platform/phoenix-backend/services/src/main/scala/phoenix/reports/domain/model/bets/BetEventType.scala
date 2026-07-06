package phoenix.reports.domain.model.bets

import scala.collection.immutable.IndexedSeq

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

sealed trait BetEventType extends EnumEntry with UpperSnakecase

object BetEventType extends Enum[BetEventType] {
  def values: IndexedSeq[BetEventType] = findValues

  final case object Open extends BetEventType
  final case object Settled extends BetEventType
  final case object Cancelled extends BetEventType
  final case object Voided extends BetEventType
  final case object Resettled extends BetEventType
}
