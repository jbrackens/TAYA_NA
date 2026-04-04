package tech.argyll.gmx.predictorgame.engine.racing

import tech.argyll.gmx.predictorgame.domain.model.EventStatus._
import tech.argyll.gmx.predictorgame.domain.model.racing.HorseStatus._

trait DomainMapper {

  def mapEventStatus(input: String): EventStatus = {
    input match {
      case "Dormant" | "Delayed" | "Parading" | "GoingDown" | "AtThePost" | "GoingBehind" | "GoingInStalls" | "UnderOrders" | "FalseStart" => NEW
      case "Off" | "Finished" | "Result" | "Photograph" => ONGOING
      case "WeighedIn" => FINISHED
      case "RaceVoid" | "Abandoned" | _ => VOID
    }
  }

  def mapHorseStatus(input: String): HorseStatus = {
    input match {
      case "Runner" => RUNNER
      case "NonRunner" | "Withdrawn" | "Reserve" | "Doubtful" | _ => NON_RUNNER
    }
  }
}