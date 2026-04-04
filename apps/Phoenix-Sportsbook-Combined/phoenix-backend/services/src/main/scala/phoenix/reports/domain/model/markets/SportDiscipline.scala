package phoenix.reports.domain.model.markets

import scala.collection.immutable.IndexedSeq

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

sealed abstract class SportDiscipline(override val entryName: String) extends EnumEntry with UpperSnakecase

object SportDiscipline extends Enum[SportDiscipline] {
  def values: IndexedSeq[SportDiscipline] = findValues

  final case object AmericanFootball extends SportDiscipline("American Football")
  final case object Baseball extends SportDiscipline("Baseball")
  final case object Basketball extends SportDiscipline("Basketball")
  final case object Boxing extends SportDiscipline("Boxing")
  final case object Football extends SportDiscipline("Football")
  final case object Golf extends SportDiscipline("Golf")
  final case object MotorSport extends SportDiscipline("Motor Sport")
  final case object Tennis extends SportDiscipline("Tennis")
  final case object Other extends SportDiscipline("Other")

}
