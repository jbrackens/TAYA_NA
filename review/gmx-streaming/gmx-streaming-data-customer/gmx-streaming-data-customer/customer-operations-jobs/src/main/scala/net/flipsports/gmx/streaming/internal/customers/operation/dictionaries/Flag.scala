package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

import ca.mrvisser.sealerate

sealed abstract class Flag(val name: String) extends Serializable {

  override def toString: String = name

}

object Flag {

  case object CustomerAddressVerified extends Flag("addressVerified")

  case object CustomerIdVerified extends Flag("isIdVerified")

  def values: Set[Flag] = sealerate.values[Flag]
}
