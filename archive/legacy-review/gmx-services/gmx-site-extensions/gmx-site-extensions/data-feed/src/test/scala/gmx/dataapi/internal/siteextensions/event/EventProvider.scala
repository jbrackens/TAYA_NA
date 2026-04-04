package gmx.dataapi.internal.siteextensions.event

import scala.jdk.CollectionConverters.iterableAsScalaIterableConverter

import tech.argyll.video.domain.model.SportType

import gmx.dataapi.internal.siteextensions.JsonUtil
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter.DictionaryConverter.mapSportType

object EventProvider {
  val util = new JsonUtil()

  def fromJson(json: String): Event = {
    val result = util.fromJson[Event](json)

    //TODO (GM-1756): JSON does not holds any information useful to deserialize automatically, need to manually handle different types
    val sport = mapSportType(result.getSportId)
    result.getParticipants.asScala.foreach(participant => {
      val details = sport match {
        case SportType.HORSE_RACING =>
          HorseRacingParticipantDetailsProvider.fromJson(util.toJson(participant.getDetails))

        case SportType.SOCCER | SportType.FOOTBALL =>
          MatchParticipantDetailsProvider.fromJson(util.toJson(participant.getDetails))

        case _ => CompetitionParticipantDetailsProvider.fromJson(util.toJson(participant.getDetails))
      }
      participant.setDetails(details)
    })

    result
  }
}
