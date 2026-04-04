package gmx.common.internal.partner.sbtech.cons

import scala.collection.breakOut

import enumeratum.Enum
import enumeratum.EnumEntry
import tech.argyll.video.domain.model.SportType

sealed trait SBTechSportType extends EnumEntry {
  def sbtechId: String
  def sportType: SportType
}

object SBTechSportType extends Enum[SBTechSportType] {
  class SBTechSportTypeRecord(val sbtechId: String, val sportType: SportType) extends SBTechSportType

  val values = findValues

  private val byId: Map[String, SBTechSportType] = values.map(elem => (elem.sbtechId, elem))(breakOut)

  final case object Soccer extends SBTechSportTypeRecord("1", SportType.SOCCER)
  final case object Football extends SBTechSportTypeRecord("3", SportType.FOOTBALL)
  final case object HorseRacing extends SBTechSportTypeRecord("61", SportType.HORSE_RACING)
  final case object EnhancedOdds extends SBTechSportTypeRecord("79", SportType.ENHANCED_ODDS)

  def findById(in: String): Option[SBTechSportType] = byId.get(in)
}
