package tech.argyll.gmx.predictorgame.domain.model

import play.api.libs.json._

package object team {

  implicit val selectionDetailsConverter: Format[TeamCompetitionSelectionDetails] = Json.format[TeamCompetitionSelectionDetails]
}
