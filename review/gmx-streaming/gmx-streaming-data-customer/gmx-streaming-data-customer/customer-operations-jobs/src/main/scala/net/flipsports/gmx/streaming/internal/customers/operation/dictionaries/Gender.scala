package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

import ca.mrvisser.sealerate

sealed abstract class Gender(val name: String, val fullName: String) extends Serializable {

  override def toString: String = name

  def genderMatch(candidate: String): Boolean = name.equalsIgnoreCase(candidate)

  def genderMatch(candidate: Gender): Boolean = candidate.genderMatch(name)

}

object Gender {

  case object Unknown extends Gender("N/A","N/A")

  case object Male extends Gender("M","male")

  case object Female extends Gender("F", "female")

  def values: Set[Gender] = sealerate.values[Gender]

  def apply(code: String): Gender = values.find(_.genderMatch(code)).getOrElse(throw new RuntimeException("Missing gender!"))
}
