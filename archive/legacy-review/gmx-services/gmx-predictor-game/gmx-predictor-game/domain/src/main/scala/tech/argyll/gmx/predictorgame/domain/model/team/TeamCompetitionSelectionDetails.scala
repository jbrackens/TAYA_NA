package tech.argyll.gmx.predictorgame.domain.model.team

import play.api.libs.json.{JsValue, Json}

case class TeamCompetitionSelectionDetails(name: String, score: Option[Int])

object TeamCompetitionSelectionDetails {
  def readString(input: String): TeamCompetitionSelectionDetails = {
    readJsValue(Json.parse(input))
  }

  def readJsValue(input: JsValue): TeamCompetitionSelectionDetails = {
    input.validate[TeamCompetitionSelectionDetails].get
  }

  def writeString(input: TeamCompetitionSelectionDetails): String = {
    Json.toJson(input).toString()
  }
}
