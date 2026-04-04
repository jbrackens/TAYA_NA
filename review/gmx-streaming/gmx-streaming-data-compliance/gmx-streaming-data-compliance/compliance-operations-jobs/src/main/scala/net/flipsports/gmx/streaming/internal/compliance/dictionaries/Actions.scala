package net.flipsports.gmx.streaming.internal.compliance.dictionaries

import ca.mrvisser.sealerate

sealed abstract class Actions(val name: String) extends Serializable {

  override def toString: String = name

}


object Actions {

  case object Tags extends Actions("Tags")

  def values: Set[Actions] = sealerate.values[Actions]

}