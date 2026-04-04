package tech.argyll.gmx.predictorgame.security.auth.rmx

import org.cache2k.expiry.ValueWithExpiryTime

case class OIDCToken(token: String, expiresAt: Long, cacheOffset: Long) extends ValueWithExpiryTime {
  override def getCacheExpiryTime: Long = {
    (expiresAt - cacheOffset) * 1000
  }
}