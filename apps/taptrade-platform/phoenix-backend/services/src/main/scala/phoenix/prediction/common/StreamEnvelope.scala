package phoenix.prediction.common

import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.time.OffsetDateTime
import java.util.UUID

final case class StreamEnvelope[T](
    eventId: UUID,
    eventType: String,
    aggregateType: String,
    aggregateId: String,
    sequenceNo: Long,
    emittedAt: OffsetDateTime,
    checksum: String,
    payload: T)

object StreamEnvelope {

  /**
   * Calculates deterministic SHA-256 checksum from stable envelope fields and a
   * canonical payload string. The publisher defines payloadCanonicalJson.
   */
  def checksumOf(
      eventType: String,
      aggregateType: String,
      aggregateId: String,
      sequenceNo: Long,
      payloadCanonicalJson: String): String = {
    val canonical = s"$eventType|$aggregateType|$aggregateId|$sequenceNo|$payloadCanonicalJson"
    val digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8))
    digest.map("%02x".format(_)).mkString
  }
}
