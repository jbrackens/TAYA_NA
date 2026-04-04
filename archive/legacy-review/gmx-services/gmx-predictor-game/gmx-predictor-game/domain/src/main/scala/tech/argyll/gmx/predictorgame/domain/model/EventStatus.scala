package tech.argyll.gmx.predictorgame.domain.model

object EventStatus extends Enumeration {
  type EventStatus = Value
  val NEW, ONGOING, FINISHED, VOID = Value
}