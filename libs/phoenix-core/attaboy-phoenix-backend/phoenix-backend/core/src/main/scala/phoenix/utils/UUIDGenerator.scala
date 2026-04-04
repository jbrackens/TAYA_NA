package phoenix.utils

import java.util.UUID

trait UUIDGenerator {
  def generate(): UUID
}

object RandomUUIDGenerator extends UUIDGenerator {
  override def generate(): UUID = UUID.randomUUID()
}
