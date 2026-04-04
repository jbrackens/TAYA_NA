package net.flipsports.gmx.widget.argyll.betandwatch.events.module

import net.flipsports.gmx.widget.argyll.betandwatch.events.service.ScheduledService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.{ProviderLookup, ProviderStreaming}

class StreamingProviderModuleLoader {

  private var providerModules = Set[StreamingProviderContext]()

  def add(module: Option[StreamingProviderContext]): Unit = module.foreach(m => providerModules += m)

  def allProviderCache: Set[ScheduledService] = providerModules.map(_.providerCache)

  def allProviderLookup: Set[ProviderLookup] = providerModules.map(_.providerLookup)

  def allProviderStreaming: Set[ProviderStreaming] = providerModules.map(_.providerStreaming)

}
