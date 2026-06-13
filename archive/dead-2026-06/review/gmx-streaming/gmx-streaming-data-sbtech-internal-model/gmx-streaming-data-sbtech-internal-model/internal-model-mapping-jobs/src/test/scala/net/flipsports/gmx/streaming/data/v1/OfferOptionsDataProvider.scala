package net.flipsports.gmx.streaming.data.v1

import SBTech.Microservices.DataStreaming.DTO.LineInfo.v1.LineInfoWrapper
import net.flipsports.gmx.streaming.sbtech.Types


object OfferOptionsDataProvider extends DataProvider[Types.OfferOptions.SourceValue] {

  override def sourceFile: String = "offeroptions.json"

  override def fromJson(json: String): Seq[Types.OfferOptions.SourceValue] = LineInfoWrapper.fromJsonList(json)

}

