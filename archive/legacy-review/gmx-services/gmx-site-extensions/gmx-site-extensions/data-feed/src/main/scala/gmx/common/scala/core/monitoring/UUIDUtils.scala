package gmx.common.scala.core.monitoring

import java.nio.ByteBuffer
import java.util.UUID

import org.apache.commons.codec.binary.Base64

/**
 * Port from Vidi project (https://github.com/flipadmin/argyll-video-service/) should be extracted to lib
 */
object UUIDUtils {
  def uuid: String = uuidToBase64(UUID.randomUUID)

  def uuidToBase64(uuidString: String): String = {
    val uuid = UUID.fromString(uuidString)
    uuidToBase64(uuid)
  }

  def uuidToBase64(uuid: UUID): String = {
    val bb = ByteBuffer.wrap(new Array[Byte](16))
    bb.putLong(uuid.getMostSignificantBits)
    bb.putLong(uuid.getLeastSignificantBits)
    Base64.encodeBase64URLSafeString(bb.array)
  }
}
