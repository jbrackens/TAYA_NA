package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

import ca.mrvisser.sealerate

sealed abstract class RegistrationProduct (val name: String) extends Serializable {

  override def toString: String = name

  def productMatch(candidate: String): Boolean = name.equalsIgnoreCase(candidate)

  def productMatch(candidate: RegistrationProduct): Boolean = productMatch(candidate.name)

}

object RegistrationProduct {

  case object Default extends RegistrationProduct("No Data")

  case object MobileCasino extends RegistrationProduct("Mobile Casino")

  case object Mobile extends RegistrationProduct("Mobile")

  case object Web extends RegistrationProduct("Web")

  def values: Set[RegistrationProduct] = sealerate.values[RegistrationProduct]

  def apply(code: String): RegistrationProduct = values.find(_.productMatch(code)).getOrElse(Default)
}