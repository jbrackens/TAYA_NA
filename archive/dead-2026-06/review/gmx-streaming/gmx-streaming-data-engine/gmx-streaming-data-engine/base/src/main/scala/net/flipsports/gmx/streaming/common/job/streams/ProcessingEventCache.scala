package net.flipsports.gmx.streaming.common.job.streams

import net.flipsports.gmx.streaming.common.job.streams.dto.Cache
import net.flipsports.gmx.streaming.common.logging.{JoinedStreamingLogLevels, log}
import org.apache.flink.api.common.functions.RuntimeContext
import org.apache.flink.api.common.state.{MapState, MapStateDescriptor, StateTtlConfig}

trait ProcessingEventCache[K, E] extends Serializable with JoinedStreamingLogLevels {

  type ProcessingEventCache = Cache[E]
  type ProcessingEventState = MapState[K, ProcessingEventCache]

  @transient
  private var processingEventCache: Option[ProcessingEventState] = None

  def processingEventCacheDescriptor: Option[MapStateDescriptor[K, Cache[E]]]

  def isProcessingCacheEnabled(): Boolean = processingEventCacheDescriptor.isDefined

  def openCacheEventState(stateTtlConfig: StateTtlConfig)(implicit rc: RuntimeContext): Unit =
    processingEventCache = processingEventCacheDescriptor.map { descriptor =>
      extractCacheFromContextAndAppendTimeToLive(descriptor, stateTtlConfig)
    }

  def getProcessingEventCache(): Option[ProcessingEventState] = processingEventCache


  def collectProcessingEvent(key: K, value: E):Unit = {
    if (isProcessingCacheEnabled()) {
      log(logger, s"Pushing element into cache by key $key", stateOperationLevel)
      val cache = processingEventCache.get

      val cachedEvents =  (state: ProcessingEventState, key: K) =>
        if (state.contains(key)) {
          log(logger, s"Cache contains key $key", stateOperationLevel)
          cache.get(key).events
        } else {
          Seq()
        }
        val toCache = new ProcessingEventCache(cachedEvents(cache, key) :+ value)
        cache.put(key, toCache)
        log(logger, s"Pushed into cache on key: $key", stateOperationLevel)
    }
  }

  def getProcessingEvent(key: K): ProcessingEventCache = {
    val cached = processingEventCache.get
    cached.get(key)
  }

  private def extractCacheFromContextAndAppendTimeToLive(
    descriptor: MapStateDescriptor[K, Cache[E]],
    stateTtlConfig: StateTtlConfig) (implicit rc: RuntimeContext): ProcessingEventState = {
    descriptor.enableTimeToLive(stateTtlConfig)
    rc.getMapState(descriptor)
  }

}
