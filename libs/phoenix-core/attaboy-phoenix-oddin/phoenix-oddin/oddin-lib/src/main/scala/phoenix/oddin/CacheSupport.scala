package phoenix.oddin

import akka.actor.ActorSystem
import akka.http.caching.LfuCache
import akka.http.caching.scaladsl.{ Cache, CachingSettings }

trait CacheSupport {

  def createCache[T](system: ActorSystem, cacheConfig: CacheConfig): Cache[String, T] = {
    val defaultCachingSettings = CachingSettings(system)
    val lfuCacheSettings =
      defaultCachingSettings.lfuCacheSettings
        .withMaxCapacity(cacheConfig.maxCapacity)
        .withTimeToLive(cacheConfig.timeToLive)
        .withTimeToIdle(cacheConfig.timeToIdle)
    val cachingSettings =
      defaultCachingSettings.withLfuCacheSettings(lfuCacheSettings)

    LfuCache[String, T](cachingSettings)
  }
}
