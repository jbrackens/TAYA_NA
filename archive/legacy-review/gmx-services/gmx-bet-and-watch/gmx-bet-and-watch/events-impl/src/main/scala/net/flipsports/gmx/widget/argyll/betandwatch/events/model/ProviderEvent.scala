package net.flipsports.gmx.widget.argyll.betandwatch.events.model

import java.time.ZonedDateTime

import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ProviderType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingStatusType.StreamingStatusType

case class ProviderEvent(provider: ProviderType,
                         id: String,
                         location: String,
                         startTime: ZonedDateTime,
                         description: String,
                         testData: Boolean,
                         streamingStatus: StreamingStatusType,
                         streamingModel: StreamingModelType,
                         allowedCountries: Seq[String],
                         deniedCountries: Seq[String])