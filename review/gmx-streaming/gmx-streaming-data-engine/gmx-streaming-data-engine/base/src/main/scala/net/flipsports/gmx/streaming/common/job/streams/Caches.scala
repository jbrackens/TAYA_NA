package net.flipsports.gmx.streaming.common.job.streams

import net.flipsports.gmx.streaming.common.job.streams.dto.Cache
import org.apache.flink.api.common.state.{MapStateDescriptor, StateTtlConfig}
import org.apache.flink.api.common.typeinfo.TypeInformation

object Caches {

  def eventCache[KeyType, EventType](timeToLive: StateTtlConfig)(implicit keyTypeInfo: TypeInformation[KeyType], valueTypeInfo: TypeInformation[Cache[EventType]]): MapStateDescriptor[KeyType, Cache[EventType]] = {
    val cache = eventCache[KeyType, EventType]
    cache.enableTimeToLive(timeToLive)
    cache
  }


  def eventCache[KeyType, EventType]()(implicit keyTypeInfo: TypeInformation[KeyType], valueTypeInfo: TypeInformation[Cache[EventType]]): MapStateDescriptor[KeyType, Cache[EventType]] =
    new MapStateDescriptor[KeyType, Cache[EventType]]("eeg-streaming.events-cached", keyTypeInfo, valueTypeInfo)

}
