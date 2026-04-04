package tech.argyll.gmx.predictorgame.utils.seed

import tech.argyll.gmx.predictorgame.common.uuid.UUIDGenerator

object UUID extends App {
  Stream.from(0)
    .take(20)
    .foreach(_ => println(UUIDGenerator.uuid()))
}
