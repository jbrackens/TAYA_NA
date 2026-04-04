package net.flipsports.gmx.widget.argyll.betandwatch.events.module

import net.flipsports.gmx.widget.argyll.betandwatch.events.service.ScheduledService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.{ProviderLookup, ProviderStreaming}

case class StreamingProviderContext(providerCache: ScheduledService, providerLookup: ProviderLookup, providerStreaming: ProviderStreaming)

