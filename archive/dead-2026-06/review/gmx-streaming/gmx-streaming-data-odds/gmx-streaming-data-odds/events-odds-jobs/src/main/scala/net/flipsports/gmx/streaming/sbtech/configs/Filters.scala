package net.flipsports.gmx.streaming.sbtech.configs
import ca.mrvisser.sealerate

sealed abstract class Filters(val name: String) extends Serializable {

  override def toString() :String =  name

}

object Filters {

  case object HorseRacing extends Filters("HorceRacing")

  case object RaceCard extends Filters("RaceCard")

  case object DayOfEvent22 extends Filters("DayOfEvent22")

  def values: Set[Filters] = sealerate.values[Filters]
}
