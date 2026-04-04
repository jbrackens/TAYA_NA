package net.flipsports.gmx.widget.argyll.betandwatch.events.api.model

import net.flipsports.gmx.common.internal.partner.commons.cons.{SportType, StreamingModelType}
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ProviderType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingMethodType.StreamingMethodType
import play.api.libs.json.{Format, Json}

case class EventVideo(url: String, provider: ProviderType,
                      streamingMethod: StreamingMethodType, streamingModel: StreamingModelType,
                      country: String, sport: SportType)

object EventVideo extends EnumConverters {

  implicit val format: Format[EventVideo] = Json.format
}
