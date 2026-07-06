package phoenix.wallets.domain

import scala.collection.immutable.IndexedSeq

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

sealed trait ResponsibilityCheckStatus extends EnumEntry with UpperSnakecase

object ResponsibilityCheckStatus extends Enum[ResponsibilityCheckStatus] {
  def hasToAcceptResponsibilityCheck(responsibilityCheckStatus: ResponsibilityCheckStatus): Boolean =
    responsibilityCheckStatus match {
      case NeedsToBeAccepted => true
      case NoActionNeeded    => false
    }

  override def values: IndexedSeq[ResponsibilityCheckStatus] = findValues

  case object NeedsToBeAccepted extends ResponsibilityCheckStatus
  case object NoActionNeeded extends ResponsibilityCheckStatus
}
