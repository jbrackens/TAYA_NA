package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

import ca.mrvisser.sealerate

sealed abstract class OperationTrigger(val name: String) extends Serializable {

  override def toString: String = name

}

object OperationTrigger {

  case object CustomerRegistration extends OperationTrigger("CustomerRegistration")

  case object CustomerChange extends OperationTrigger("CustomerChange")

  case object DepositChange extends OperationTrigger("DepositChange")

  case object DummyFlow extends OperationTrigger("DummyFlow")

  def values: Set[OperationTrigger] = sealerate.values[OperationTrigger]

}