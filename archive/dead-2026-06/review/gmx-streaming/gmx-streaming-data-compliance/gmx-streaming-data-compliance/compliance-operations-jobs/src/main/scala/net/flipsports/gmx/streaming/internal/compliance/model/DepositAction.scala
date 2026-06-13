package net.flipsports.gmx.streaming.internal.compliance.model

case class DepositAction(actionHash: String, time: Long)
case class DepositActionKey(customerId: Int, transactionId: Long) {

  def key(): String = s"$customerId-$transactionId"

}
