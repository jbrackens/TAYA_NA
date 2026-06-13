package net.flipsports.gmx.streaming.internal.compliance.dictionaries

import ca.mrvisser.sealerate

sealed abstract class TransactionStatus(val name: String) extends Serializable {

  override def toString: String = name

  def statusMatch(candidate: String): Boolean = name.equalsIgnoreCase(candidate)

}

object TransactionStatus {

  case object Default extends TransactionStatus("Default")

  case object Declined extends TransactionStatus("Declined")

  case object Pending extends TransactionStatus("Pending")

  case object Confirmed extends TransactionStatus("Confirmed")

  def values: Set[TransactionStatus] = sealerate.values[TransactionStatus]

  def apply(code: String): TransactionStatus = values.find(_.statusMatch(code)).getOrElse(Default)
}
