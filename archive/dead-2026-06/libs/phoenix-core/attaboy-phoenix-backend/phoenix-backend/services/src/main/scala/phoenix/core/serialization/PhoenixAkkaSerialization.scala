package phoenix.core.serialization

import org.virtuslab.ash.circe.Registration

import phoenix.CirceAkkaSerializable

trait PhoenixAkkaSerialization[T <: CirceAkkaSerializable] {
  def codecEntries: Seq[Registration[_ <: T]]
}
