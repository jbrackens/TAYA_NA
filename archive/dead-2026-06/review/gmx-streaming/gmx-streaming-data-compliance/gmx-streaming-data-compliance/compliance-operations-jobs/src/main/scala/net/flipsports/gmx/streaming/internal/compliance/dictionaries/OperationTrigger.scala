package net.flipsports.gmx.streaming.internal.compliance.dictionaries

import ca.mrvisser.sealerate

sealed abstract class OperationTrigger(val name: String) extends Serializable {

  override def toString: String = name

}

object OperationTrigger {

  case object DepositChange extends OperationTrigger("DepositChange")

  def values: Set[OperationTrigger] = sealerate.values[OperationTrigger]

}