package phoenix.core

import java.security.MessageDigest

import org.apache.commons.codec.binary.Hex

object SHA256 {

  def hash(str: String): HashedValue = {
    val sha256 = MessageDigest.getInstance("SHA-256")
    HashedValue(Hex.encodeHexString(sha256.digest(str.getBytes("UTF-8"))))
  }
}

final case class HashedValue(value: String)
