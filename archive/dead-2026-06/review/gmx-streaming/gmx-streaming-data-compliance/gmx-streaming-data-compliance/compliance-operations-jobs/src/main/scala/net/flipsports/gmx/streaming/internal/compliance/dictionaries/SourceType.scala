package net.flipsports.gmx.streaming.internal.compliance.dictionaries

import ca.mrvisser.sealerate

sealed abstract class SourceType(val name: String) extends Serializable {

  override def toString: String = name

  def sourceMatch(candidate: String): Boolean = name.equalsIgnoreCase(candidate)

}

object SourceType {

  case object Default extends SourceType("Default")

  case object Withdrawal extends SourceType("Withdrawal")

  case object Deposit extends SourceType("Deposit")

  case object RewardBonus extends SourceType("")

  def values: Set[SourceType] = sealerate.values[SourceType]

  def apply(code: String): SourceType = values.find(_.sourceMatch(code)).getOrElse(Default)
}