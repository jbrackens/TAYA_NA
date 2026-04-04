package phoenix.support

import java.util.UUID

import phoenix.utils.UUIDGenerator

object ConstantUUIDGenerator extends UUIDGenerator {
  val constantUUID: UUID = UUID.randomUUID()

  override def generate(): UUID = constantUUID
}
