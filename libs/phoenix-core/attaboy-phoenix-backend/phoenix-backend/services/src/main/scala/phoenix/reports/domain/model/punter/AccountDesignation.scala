package phoenix.reports.domain.model.punter

import scala.collection.immutable.IndexedSeq

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

sealed trait AccountDesignation extends EnumEntry with UpperSnakecase

object AccountDesignation extends Enum[AccountDesignation] {
  def values: IndexedSeq[AccountDesignation] = findValues

  final case object RealAccount extends AccountDesignation
  final case object TestAccount extends AccountDesignation
}
