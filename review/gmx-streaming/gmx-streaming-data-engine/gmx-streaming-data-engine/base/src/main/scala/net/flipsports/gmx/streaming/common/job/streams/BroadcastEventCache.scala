package net.flipsports.gmx.streaming.common.job.streams

import net.flipsports.gmx.streaming.common.logging.{JoinedStreamingLogLevels, log}
import org.apache.flink.api.common.state.{BroadcastState, MapState, MapStateDescriptor, ReadOnlyBroadcastState}

import java.util.Map
import scala.collection.JavaConverters.iterableAsScalaIterableConverter

trait BroadcastEventCache[K, E] extends Serializable with JoinedStreamingLogLevels {

  type BroadcastEventState = MapState[K, E]

  def processingEventCacheDescriptor: MapStateDescriptor[K, E]

  def collectBroadcastEvent(key: K, event: E, ctx: BroadcastState[K, E]): Unit = {
    log(logger, s"Processing broadcast element. Key: $key value: ${event}", processBroadcastElementLogLevel)
    ctx.put(key, event)
    log(logger, s"Done processing broadcast element on key: $key", processBroadcastElementLogLevel)
  }

  def removeBroadcastEvent(key: K,  ctx: BroadcastState[K, E]): Unit = {
    log(logger, s"Broadcasted element value is removed. Clearing from broadcast state $key.", stateOperationLevel)
    ctx.remove(key)
    log(logger, s"Done processing broadcasted element removal on key $key.", stateOperationLevel)
  }

  def forSingleBroadcastEvent(key: K, ctx: ReadOnlyBroadcastState[K, E])(execute: E => Unit): Unit = {
      if (ctx.contains(key)) {
        log(logger, s"Broadcasted element value is present. Fetching: $key.", stateOperationLevel)
        execute(ctx.get(key))
      } else {
        log(logger, s"Broadcasted element value is null. Not fetching: $key.", stateOperationLevel)
      }
  }

  def forEachBroadcastEvent(ctx: ReadOnlyBroadcastState[K, E])(execute: Map.Entry[K, E] => Unit): Unit = {
    ctx.immutableEntries().asScala.foreach(execute)
  }
}
