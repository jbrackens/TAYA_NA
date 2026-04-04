package stella.events.it.containers.redis

import com.dimafeng.testcontainers.GenericContainer

trait RedisContainer {
  private val internalPort = 6379
  val redisContainer: GenericContainer = GenericContainer("redis:6", exposedPorts = Seq(internalPort))

  def redisMappedPort: Int = redisContainer.mappedPort(internalPort)
}
