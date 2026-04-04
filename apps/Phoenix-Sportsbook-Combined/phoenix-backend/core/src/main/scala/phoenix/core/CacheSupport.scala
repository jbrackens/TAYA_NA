package phoenix.core

import scala.concurrent.duration.FiniteDuration

import akka.actor.ActorSystem
import akka.http.caching.LfuCache
import akka.http.caching.scaladsl.Cache
import akka.http.caching.scaladsl.CachingSettings

trait CacheSupport {

  def createCache[K, V](system: ActorSystem, cacheConfig: CacheConfig): Cache[K, V] = {
    val defaultCachingSettings = CachingSettings(system)
    val lfuCacheSettings =
      defaultCachingSettings.lfuCacheSettings
        .withInitialCapacity(cacheConfig.initialCapacity)
        .withMaxCapacity(cacheConfig.maxCapacity)
        .withTimeToLive(cacheConfig.timeToLive)
        .withTimeToIdle(cacheConfig.timeToIdle)
    val cachingSettings =
      defaultCachingSettings.withLfuCacheSettings(lfuCacheSettings)

    LfuCache[K, V](cachingSettings)
  }
}

object CacheSupport extends CacheSupport

final case class CacheConfig(
    initialCapacity: Int,
    maxCapacity: Int,
    timeToLive: FiniteDuration,
    timeToIdle: FiniteDuration)
