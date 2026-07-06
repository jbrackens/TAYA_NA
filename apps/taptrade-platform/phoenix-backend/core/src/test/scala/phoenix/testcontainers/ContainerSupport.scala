package phoenix.testcontainers

import scala.util.Random

import phoenix.core.Clock

trait ContainerSupport {
  def generateRandomNamespace(clock: Clock): String = {
    s"${clock.currentOffsetDateTime().toEpochSecond}_${Random.alphanumeric.take(6).mkString}"
  }
}
