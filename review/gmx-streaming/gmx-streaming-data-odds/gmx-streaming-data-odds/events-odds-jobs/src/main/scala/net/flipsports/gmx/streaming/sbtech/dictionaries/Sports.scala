package net.flipsports.gmx.streaming.sbtech.dictionaries

import ca.mrvisser.sealerate


sealed abstract class Sports(val id: Int, val name: String)

object Sports {

  case object HorseRacing extends Sports(61, "Horse Racing")

  case object Soccer extends Sports(1, "Soccer")

  case object AmericanFootball extends Sports(3, "American Football")

  case object Competition extends Sports(-1, "Any Competition")

  def values: Set[Sports] = sealerate.values[Sports]

  def apply(id: Int): Sports = values.find(_.id == id).getOrElse(Competition)

  def apply(id: String): Sports = apply(id.toInt)

}