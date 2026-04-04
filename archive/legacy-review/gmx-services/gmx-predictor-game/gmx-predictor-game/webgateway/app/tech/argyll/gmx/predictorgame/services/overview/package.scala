package tech.argyll.gmx.predictorgame.services

import tech.argyll.gmx.predictorgame.services.prediction.Evaluation.Evaluation

package object overview {

  case class OverviewUser(id: String, userName: String, items: Seq[OverviewEntry])

  case class OverviewEntry(id: String, title: String, points: Int, selection: Option[String],
                           matchStatus: String, evaluation: Option[Evaluation])

}