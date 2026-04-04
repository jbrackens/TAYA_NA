package net.flipsports.gmx.widget.argyll.betandwatch.events.api.model

import net.flipsports.gmx.common.internal.partner.commons.cons.{SportType, StreamingModelType}
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ProviderType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingStatusType.StreamingStatusType
import play.api.libs.json.{Format, Json}

case class EventStatus(streamingStatus: StreamingStatusType, provider: ProviderType,
                       streamingModel: StreamingModelType,
                       country: String, sport: SportType)

object EventStatus extends EnumConverters {

  implicit val format: Format[EventStatus] = Json.format
}
