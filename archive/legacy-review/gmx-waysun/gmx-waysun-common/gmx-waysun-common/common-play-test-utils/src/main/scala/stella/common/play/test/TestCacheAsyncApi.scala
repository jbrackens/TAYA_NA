package stella.common.play.test

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.Duration
import scala.reflect.ClassTag

import play.api.cache.redis.AsynchronousResult
import play.api.cache.redis.CacheAsyncApi
import play.api.cache.redis.Done
import play.api.cache.redis.RedisList
import play.api.cache.redis.RedisMap
import play.api.cache.redis.RedisSet
import play.api.cache.redis.RedisSortedSet

import stella.common.core.Clock

class TestCacheAsyncApi(clock: Clock)(implicit ec: ExecutionContext) extends CacheAsyncApi {
  private var cache: Map[String, (Any, Long)] = Map.empty

  // the only method we use in prod logic
  override def getOrFuture[T: ClassTag](key: String, expiration: Duration)(orElse: => Future[T]): Future[T] =
    synchronized {
      val currentTimeMillis = clock.currentUtcOffsetDateTime().toInstant.toEpochMilli
      cache.get(key) match {
        case Some((value, expirationTimeMillis)) if expirationTimeMillis >= currentTimeMillis =>
          Future.successful(value.asInstanceOf[T])
        case _ =>
          val expirationTimeMillis = currentTimeMillis + expiration.toMillis
          orElse.map { value =>
            cache = cache.updated(key, (value, expirationTimeMillis))
            value
          }
      }
    }

  override def get[T: ClassTag](key: String): AsynchronousResult[Option[T]] = ???

  override def getAll[T: ClassTag](keys: Iterable[String]): AsynchronousResult[Seq[Option[T]]] =
    ???

  override def getOrElse[T: ClassTag](key: String, expiration: Duration)(orElse: => T): AsynchronousResult[T] = ???

  override def exists(key: String): AsynchronousResult[Boolean] = ???

  override def matching(pattern: String): AsynchronousResult[Seq[String]] = ???

  override def set(key: String, value: Any, expiration: Duration): AsynchronousResult[Done] = ???

  override def setIfNotExists(key: String, value: Any, expiration: Duration): AsynchronousResult[Boolean] = ???

  override def setAll(keyValues: (String, Any)*): AsynchronousResult[Done] = ???

  override def setAllIfNotExist(keyValues: (String, Any)*): AsynchronousResult[Boolean] = ???

  override def append(key: String, value: String, expiration: Duration): AsynchronousResult[Done] = ???

  override def expire(key: String, expiration: Duration): AsynchronousResult[Done] = ???

  override def expiresIn(key: String): AsynchronousResult[Option[Duration]] = ???

  override def remove(key: String): AsynchronousResult[Done] = ???

  override def remove(key1: String, key2: String, keys: String*): AsynchronousResult[Done] = ???

  override def removeAll(keys: String*): AsynchronousResult[Done] = ???

  override def removeMatching(pattern: String): AsynchronousResult[Done] = ???

  override def invalidate(): AsynchronousResult[Done] = ???

  override def increment(key: String, by: Long): AsynchronousResult[Long] = ???

  override def decrement(key: String, by: Long): AsynchronousResult[Long] = ???

  override def list[T: ClassTag](key: String): RedisList[T, AsynchronousResult] = ???

  override def set[T: ClassTag](key: String): RedisSet[T, AsynchronousResult] = ???

  override def map[T: ClassTag](key: String): RedisMap[T, AsynchronousResult] = ???

  override def zset[T: ClassTag](key: String): RedisSortedSet[T, AsynchronousResult] = ???
}
