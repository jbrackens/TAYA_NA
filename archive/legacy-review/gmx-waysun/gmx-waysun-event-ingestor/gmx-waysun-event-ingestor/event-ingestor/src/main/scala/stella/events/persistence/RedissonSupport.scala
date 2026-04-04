package stella.events.persistence

import java.util.{Deque => JDeque}

import org.redisson.Redisson
import org.redisson.api.RedissonClient
import org.redisson.config.Config

import stella.dataapi.platformevents.EventData

import stella.events.config.RedisPersistenceConfig

trait RedissonSupport {

  val redissonConfig: Config
  val redisPersistenceConfig: RedisPersistenceConfig
  protected lazy val redissonClient: RedissonClient = Redisson.create(redissonConfig)

  // narrow type to avoid conflicts with vararg method when using in Scala
  protected lazy val redisList: JDeque[EventData] =
    redissonClient.getDeque[EventData](redisPersistenceConfig.collectionName)
}
