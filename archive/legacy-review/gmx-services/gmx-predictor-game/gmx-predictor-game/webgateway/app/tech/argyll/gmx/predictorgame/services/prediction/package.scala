package tech.argyll.gmx.predictorgame.services

import java.time.ZonedDateTime

import play.api.libs.json.JsValue
import tech.argyll.gmx.predictorgame.services.prediction.Evaluation.Evaluation
import tech.argyll.gmx.predictorgame.services.prediction.PrizeQualification.PrizeQualification
import tech.argyll.gmx.predictorgame.services.prediction.RoundStatus.RoundStatus

package object prediction {

  object RoundStatus extends Enumeration {
    type RoundStatus = Value
    val NEW, SAVED, LOCKED, FINISHED, VOID = Value
  }

  object PrizeQualification extends Enumeration {
    type PrizeQualification = Value
    val QUALIFIED, EXCLUDED = Value
  }

  object Evaluation extends Enumeration {
    type Evaluation = Value
    val WON, LOST = Value
  }

  case class RoundPrediction(status: RoundStatus, prizeQualification: Option[PrizeQualification],
                             predictions: Seq[EventPrediction])

  case class EventPrediction(id: String, startTime: ZonedDateTime, selections: Vector[EventSelection],
                             points: Int, selection: Option[String],
                             matchStatus: String, locked: Boolean, winner: Option[String],
                             evaluation: Option[Evaluation], score: Option[Int], details: JsValue)

  case class EventSelection(index: Int, id: String, details: JsValue)

  case class SelectedPrediction(id: String, points: Int, selection: Option[String])

}
