package tech.argyll.gmx.predictorgame.domain.model.racing

import play.api.libs.json.{JsValue, Json}

case class HorseRacingSelectionDetails(horseId: Long,
                                       lineId: String,
                                       horseName: String,
                                       jockeyName: String,
                                       trainerName: String,
                                       jockeySilk: String,
                                       price: String,
                                       status: Option[String],
                                       finishPosition: Option[Int])

object HorseRacingSelectionDetails {
  def readString(input: String): HorseRacingSelectionDetails = {
    readJsValue(Json.parse(input))
  }

  def readJsValue(input: JsValue): HorseRacingSelectionDetails = {
    input.validate[HorseRacingSelectionDetails].get
  }

  def writeString(input: HorseRacingSelectionDetails): String = {
    Json.toJson(input).toString()
  }
}
