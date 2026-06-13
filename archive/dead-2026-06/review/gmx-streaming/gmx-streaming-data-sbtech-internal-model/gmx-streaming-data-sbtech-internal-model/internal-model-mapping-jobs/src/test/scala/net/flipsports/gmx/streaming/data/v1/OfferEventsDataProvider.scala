package net.flipsports.gmx.streaming.data.v1

import SBTech.Microservices.DataStreaming.DTO.EventsInfo.v1.EventInfoWrapper
import net.flipsports.gmx.streaming.sbtech.Types


object OfferEventsDataProvider extends DataProvider[Types.OfferEvents.SourceValue] {

  override def sourceFile: String = "offerevents.json"

  override def fromJson(json: String): Seq[Types.OfferEvents.SourceValue] = EventInfoWrapper.fromJsonList(json)

}

