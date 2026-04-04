package net.flipsports.gmx.widget.argyll.betandwatch.events.model

import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ProviderType

case class EventMapping(event: PageEvent, provider: ProviderType, streamingModel: StreamingModelType, stream: Option[ProviderEvent])