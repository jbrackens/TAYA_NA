package tech.argyll.gmx.predictorgame.domain.model

import play.api.libs.json._

package object racing {

  implicit val selectionDetailsConverter: Format[HorseRacingSelectionDetails] = Json.format[HorseRacingSelectionDetails]
}
