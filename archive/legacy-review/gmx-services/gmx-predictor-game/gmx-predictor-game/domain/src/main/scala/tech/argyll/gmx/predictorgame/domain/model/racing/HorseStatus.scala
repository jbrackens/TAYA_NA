package tech.argyll.gmx.predictorgame.domain.model.racing

object HorseStatus extends Enumeration {
  type HorseStatus = Value
  val RUNNER, CASUALTY, NON_RUNNER = Value
}